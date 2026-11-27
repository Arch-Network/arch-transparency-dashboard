import { useEffect, useMemo, useRef } from 'react'
import Overview from './tabs/Overview'
import Markets from './tabs/Markets'
import Risk from './tabs/Risk'
import ArchUsd from './tabs/ArchUsd'
import Header, { DesktopRail, DesktopTopBar, type NavPage } from './components/Header'
import Methodology from './components/Methodology'
import Notices, { Unavailable } from './components/Notices'
import { ARCHUSD_ENABLED } from './lib/flags'
import { RangeProvider, rangeOptions, usePageHref } from './lib/range'
import { OpenPanel, useRoute, type PageId } from './lib/route'
import { useSnapshot } from './lib/useSnapshot'

const pages: NavPage[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'markets', label: 'Markets' },
  { id: 'risk', label: 'Risk' },
  ...(ARCHUSD_ENABLED ? [{ id: 'archusd' as const, label: 'ArchUSD' }] : []),
]

/** Brings the route's anchor into view once its page is on screen; the top of the page where there is none.
 * A side panel opening or closing over a page leaves the page where it is. */
function useAnchorScroll(page: PageId, anchor: string | null, panel: string | null, ready: boolean) {
  const last = useRef<{ page: PageId; panel: boolean } | null>(null)
  useEffect(() => {
    if (!ready) return
    const stay = last.current?.page === page && (panel !== null || last.current.panel)
    last.current = { page, panel: panel !== null }
    if (stay) return
    const target = anchor && document.getElementById(anchor)
    if (target) target.scrollIntoView()
    else window.scrollTo({ top: 0 })
  }, [page, anchor, panel, ready])
}

export default function App() {
  const [route, setRange] = useRoute()
  const { data, error } = useSnapshot()
  const page = route.page === 'archusd' && !ARCHUSD_ENABLED ? 'overview' : route.page
  useAnchorScroll(page, route.anchor, route.panel, data !== null)

  // A range the address names but the history is too short to offer shows all of it.
  const days = data?.series.tvl_daily.length ?? 0
  const rangeState = useMemo(() => {
    const options = rangeOptions(days)
    return { range: options.includes(route.range) ? route.range : ('All' as const), setRange, options }
  }, [days, route.range, setRange])

  return (
    <RangeProvider value={rangeState}>
      {/* Arch Prime v2 shell: outer chrome (#fff / #000), 88px left rail, 62px top bar, inset rounded canvas (#f7f7f8 / #070708). */}
      <div className="min-h-screen bg-chrome lg:grid lg:grid-cols-[88px_minmax(0,1fr)] lg:grid-rows-[62px_minmax(0,1fr)] lg:pr-[10px] lg:pb-[10px]">
        <DesktopRail pages={pages} current={page} />
        <DesktopTopBar data={data} error={error} />
        <Header pages={pages} current={page} data={data} error={error} />

        <div className="flex min-h-[calc(100svh-56px)] min-w-0 flex-col bg-canvas lg:col-start-2 lg:row-start-2 lg:min-h-[calc(100svh-72px)] lg:rounded-[18px]">
          <main className="mx-auto w-[min(1360px,100%)] flex-1 px-4 pt-5 pb-24 sm:px-6 lg:px-7 lg:pt-7 lg:pb-10">
            {!data ? (
              <Unavailable error={error} />
            ) : (
              <>
                <Notices data={data} error={error} />
                <OpenPanel.Provider value={route.panel}>
                  {page === 'overview' && <Overview data={data} />}
                  {page === 'markets' && <Markets data={data} />}
                  {page === 'risk' && <Risk data={data} />}
                  {page === 'archusd' && <ArchUsd data={data} />}
                  {page === 'methodology' && <Methodology data={data} />}
                </OpenPanel.Provider>
              </>
            )}
          </main>

          <Footer network={data?.meta.network} version={data?.meta.analytics_version} />
        </div>
      </div>
    </RangeProvider>
  )
}

function Footer({ network, version }: { network?: string; version?: string }) {
  const href = usePageHref()
  return (
    <footer className="border-t border-line pb-20 lg:pb-0">
      <div className="mx-auto flex w-[min(1360px,100%)] flex-wrap items-center justify-between gap-2 px-4 py-4 text-[12.5px] text-ink-3 sm:px-6 lg:px-7">
        <span>
          Live {network ? `${network} ` : ''}data from Arch Prime Analytics
          {version ? <span className="mono ml-1 text-[11.5px]">{version}</span> : ''} and the Arch Explorer.
        </span>
        <span className="flex items-center gap-4">
          <a href={href('methodology')} className="link text-ink-2 hover:text-ink">
            Methodology
          </a>
          <span className="font-heading font-medium text-ink-2">Arch Prime</span>
        </span>
      </div>
    </footer>
  )
}
