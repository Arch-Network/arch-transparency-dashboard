import { useEffect, useMemo, useRef } from 'react'
import Overview from './tabs/Overview'
import Markets from './tabs/Markets'
import Perps from './tabs/Perps'
import Risk from './tabs/Risk'
import ArchUsd from './tabs/ArchUsd'
import Header, { type NavPage } from './components/Header'
import Methodology from './components/Methodology'
import Notices, { Unavailable } from './components/Notices'
import { ARCHUSD_ENABLED } from './lib/flags'
import { RangeProvider, rangeOptions, usePageHref } from './lib/range'
import { OpenPanel, useRoute, type PageId } from './lib/route'
import { useSnapshot } from './lib/useSnapshot'

const pages: NavPage[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'markets', label: 'Markets' },
  { id: 'perps', label: 'Perps' },
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
      <div className="flex min-h-screen flex-col bg-page text-ink">
        <Header pages={pages} current={page} data={data} error={error} />

        <main className="mx-auto w-[min(1320px,100%)] flex-1 px-4 py-6 sm:px-6">
          {!data ? (
            <Unavailable error={error} />
          ) : (
            <>
              <Notices data={data} error={error} />
              <OpenPanel.Provider value={route.panel}>
                {page === 'overview' && <Overview data={data} />}
                {page === 'markets' && <Markets data={data} />}
                {page === 'perps' && <Perps data={data} />}
                {page === 'risk' && <Risk data={data} />}
                {page === 'archusd' && <ArchUsd data={data} />}
                {page === 'methodology' && <Methodology data={data} />}
              </OpenPanel.Provider>
            </>
          )}
        </main>

        <Footer network={data?.meta.network} version={data?.meta.analytics_version} />
      </div>
    </RangeProvider>
  )
}

function Footer({ network, version }: { network?: string; version?: string }) {
  const href = usePageHref()
  return (
    <footer className="mt-6 border-t border-line bg-chrome/60">
      <div className="mx-auto flex w-[min(1320px,100%)] flex-wrap items-center justify-between gap-2 px-4 py-4 text-[12px] text-ink-3 sm:px-6">
        <span>
          Live {network ? `${network} ` : ''}data from Arch Prime Analytics
          {version ? <span className="mono ml-1 text-[11px]">{version}</span> : ''}, Arch Perps Engine and the Arch
          Explorer.
        </span>
        <span className="flex items-center gap-4">
          <a href={href('methodology')} className="font-medium text-ink transition-opacity hover:opacity-75">
            Methodology
          </a>
          <span className="font-heading font-medium text-ink-2">Arch Prime</span>
        </span>
      </div>
    </footer>
  )
}
