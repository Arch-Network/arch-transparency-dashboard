import { useEffect, useMemo } from 'react'
import Overview from './tabs/Overview'
import Markets from './tabs/Markets'
import Risk from './tabs/Risk'
import ArchUsd from './tabs/ArchUsd'
import Header from './components/Header'
import Methodology from './components/Methodology'
import Notices, { Unavailable } from './components/Notices'
import { ARCHUSD_ENABLED } from './lib/flags'
import { RangeProvider, rangeOptions, usePageHref } from './lib/range'
import { useRoute, type PageId } from './lib/route'
import { useSnapshot } from './lib/useSnapshot'

const pages: { id: PageId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'markets', label: 'Markets' },
  { id: 'risk', label: 'Risk' },
  ...(ARCHUSD_ENABLED ? [{ id: 'archusd' as const, label: 'ArchUSD' }] : []),
]

/** Brings the route's anchor into view once its page is on screen; the top of the page where there is none. */
function useAnchorScroll(page: PageId, anchor: string | null, ready: boolean) {
  useEffect(() => {
    if (!ready) return
    const target = anchor && document.getElementById(anchor)
    if (target) target.scrollIntoView()
    else window.scrollTo({ top: 0 })
  }, [page, anchor, ready])
}

export default function App() {
  const [route, setRange] = useRoute()
  const { data, error } = useSnapshot()
  const page = route.page === 'archusd' && !ARCHUSD_ENABLED ? 'overview' : route.page
  useAnchorScroll(page, route.anchor, data !== null)

  // A range the address names but the history is too short to offer shows all of it.
  const days = data?.series.tvl_daily.length ?? 0
  const rangeState = useMemo(() => {
    const options = rangeOptions(days)
    return { range: options.includes(route.range) ? route.range : ('All' as const), setRange, options }
  }, [days, route.range, setRange])

  return (
    <RangeProvider value={rangeState}>
      <div className="min-h-screen">
        <Header pages={pages} current={page} data={data} error={error} />

        <main className="mx-auto w-[min(1440px,100%)] px-4 py-6 sm:px-6">
          {!data ? (
            <Unavailable error={error} />
          ) : (
            <>
              <Notices data={data} error={error} />
              {page === 'overview' && <Overview data={data} />}
              {page === 'markets' && <Markets data={data} />}
              {page === 'risk' && <Risk data={data} />}
              {page === 'archusd' && <ArchUsd data={data} />}
              {page === 'methodology' && <Methodology data={data} />}
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
    <footer className="border-t border-line py-4">
      <div className="mx-auto flex w-[min(1440px,100%)] flex-wrap items-center justify-between gap-2 px-4 text-[13px] text-ink-2 sm:px-6">
        <span>
          Live {network ? `${network} ` : ''}data from Arch Prime Analytics{version ? ` ${version}` : ''} and the
          Arch Explorer.
        </span>
        <span className="flex items-center gap-3">
          <a href={href('methodology')} className="link hover:text-ink">
            Methodology
          </a>
          <span>Arch Prime</span>
        </span>
      </div>
    </footer>
  )
}
