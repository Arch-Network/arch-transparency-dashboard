import { useEffect, useState } from 'react'
import type { Snapshot, SnapshotMeta } from './data/snapshot'
import Overview from './tabs/Overview'
import Risk from './tabs/Risk'
import ArchUsd from './tabs/ArchUsd'
import Methodology from './components/Methodology'
import ThemeToggle from './components/ThemeToggle'
import { ARCHUSD_ENABLED } from './lib/flags'
import { fmtTs } from './lib/format'
import { useSnapshot } from './lib/useSnapshot'

type TabId = 'overview' | 'risk' | 'archusd'

const tabs: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'risk', label: 'Risk' },
  ...(ARCHUSD_ENABLED ? [{ id: 'archusd' as TabId, label: 'ArchUSD' }] : []),
]

function useUtcClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now.toISOString().slice(11, 19) + ' UTC'
}

function initialTab(): TabId {
  const h = window.location.hash.replace('#', '')
  return tabs.some((t) => t.id === h) ? (h as TabId) : 'overview'
}

export default function App() {
  const [tab, setTabState] = useState<TabId>(initialTab)
  const setTab = (t: TabId) => {
    setTabState(t)
    window.history.replaceState(null, '', `#${t}`)
  }
  const [showMethodology, setShowMethodology] = useState(false)
  const clock = useUtcClock()
  const { data, error } = useSnapshot()
  const openMethodology = () => {
    setShowMethodology(true)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="min-h-screen">
      {/* Persistent header: logo, sections, live status, theme toggle. One row from lg up;
          below that the status drops to its own row, and on phones the sections do too. */}
      <header className="sticky top-0 z-50 border-b border-line bg-page">
        <div className="mx-auto flex min-h-14 w-[min(1440px,100%)] flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2 sm:px-6">
          <a href="/" className="inline-flex shrink-0 items-center">
            {/* The official lockup in both inks: light on the dark theme, dark on the light one. */}
            <img
              src="/arch-prime-logo-light.svg"
              alt="Arch Prime"
              width={130}
              height={18}
              className="h-[18px] w-auto [[data-theme=light]_&]:hidden"
            />
            <img
              src="/arch-prime-logo.svg"
              alt="Arch Prime"
              width={130}
              height={18}
              className="hidden h-[18px] w-auto [[data-theme=light]_&]:block"
            />
          </a>

          <nav
            aria-label="Sections"
            // The padding (taken back by the margin) leaves room for the focus ring inside the scroll box.
            className="order-2 -m-1 flex w-full min-w-0 items-center gap-0.5 overflow-x-auto p-1 sm:order-none sm:w-auto"
          >
            {tabs.map((t) => {
              const active = tab === t.id && !showMethodology
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => {
                    setTab(t.id)
                    setShowMethodology(false)
                  }}
                  className={
                    'inline-flex h-8 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-control px-2.5 text-[15px] ' +
                    (active ? 'font-medium text-ink' : 'text-ink-2 hover:text-ink')
                  }
                >
                  {t.label}
                </button>
              )
            })}
          </nav>

          <HeaderStatus data={data} error={error} clock={clock} />
          <ThemeToggle className="order-1 ml-auto lg:ml-0" />
        </div>
      </header>

      <main className="mx-auto w-[min(1440px,100%)] px-4 py-6 sm:px-6">
        {!data ? (
          <Unavailable error={error} />
        ) : (
          <>
            <Notices data={data} error={error} />
            {showMethodology ? (
              <Methodology data={data} onBack={() => setShowMethodology(false)} />
            ) : (
              <>
                {tab === 'overview' && <Overview data={data} onMethodology={openMethodology} />}
                {tab === 'risk' && <Risk data={data} onMethodology={openMethodology} />}
                {tab === 'archusd' && ARCHUSD_ENABLED && <ArchUsd data={data} onMethodology={openMethodology} />}
              </>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-line py-4">
        <div className="mx-auto flex w-[min(1440px,100%)] flex-wrap items-center justify-between gap-2 px-4 text-[13px] text-ink-2 sm:px-6">
          <span>
            Live {data ? `${data.meta.network} ` : ''}data from Arch Prime Analytics
            {data ? ` ${data.meta.analytics_version}` : ''} and the Arch Explorer.
          </span>
          <span className="flex items-center gap-3">
            <button type="button" onClick={openMethodology} className="link hover:text-ink">
              Methodology
            </button>
            <span>Arch Prime</span>
          </span>
        </div>
      </footer>
    </div>
  )
}

const LAG_LIMIT_MS = 10 * 60_000

/** Whether an upstream's data was more than ten minutes old when the snapshot was built. */
function lagging(meta: SnapshotMeta, at: string | null): boolean {
  return at !== null && Date.parse(meta.as_of) - Date.parse(at) > LAG_LIMIT_MS
}

function HeaderStatus({ data, error, clock }: { data: Snapshot | null; error: string | null; clock: string }) {
  const delayed =
    data !== null &&
    (lagging(data.meta, data.meta.analytics_synced_at) || lagging(data.meta, data.meta.explorer_indexed_at))
  const status = error ? 'STALE' : !data ? 'LOADING' : delayed ? 'DELAYED' : 'LIVE'
  return (
    <div className="order-3 w-full text-xs text-ink-2 lg:order-none lg:ml-auto lg:w-auto lg:text-right">
      <div className="flex flex-wrap items-center gap-x-3 lg:justify-end">
        {/* Colored mark and word: green while live, amber while delayed, stale or loading. */}
        <span
          className={
            'inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium ' +
            (status === 'LIVE' ? 'text-up' : 'text-warn')
          }
        >
          <span aria-hidden="true" className="inline-block size-2 shrink-0 rounded-full bg-current" />
          {status}
        </span>
        <span>{clock}</span>
        {data && <span className="chip capitalize">{data.meta.network}</span>}
        {data?.chain && (
          <span>
            Arch block {data.chain.arch_block.toLocaleString('en-US')}
            {data.chain.btc_tip_block !== null &&
              ` · Bitcoin tip ${data.chain.btc_tip_block.toLocaleString('en-US')}`}
          </span>
        )}
      </div>
      {data && (
        <div>
          Last updated {fmtTs(data.meta.as_of)} · refreshes every {data.meta.refresh_seconds} s
        </div>
      )}
    </div>
  )
}

/** Shown in place of the tabs until a first snapshot arrives. */
function Unavailable({ error }: { error: string | null }) {
  return (
    <div
      className={
        'mx-auto mt-10 max-w-xl rounded-card border p-4 text-center text-[13px] ' +
        (error ? 'border-down-line bg-down-soft' : 'border-line bg-card')
      }
    >
      {error ? (
        <>
          <p className="font-medium">Live data is unavailable right now</p>
          <p className="mt-1">{error} Retrying every minute.</p>
        </>
      ) : (
        <p className="text-ink-2">Loading live data…</p>
      )}
    </div>
  )
}

/** What the reader should know about the snapshot on screen: stale, delayed or partial. */
function Notices({ data, error }: { data: Snapshot; error: string | null }) {
  const { meta } = data
  const notices = [
    ...(error ? [`The latest refresh failed, so these figures are as of ${fmtTs(meta.as_of)}. ${error}`] : []),
    ...(meta.analytics_synced_at && lagging(meta, meta.analytics_synced_at)
      ? [`Arch Prime Analytics last caught up with the chain at ${fmtTs(meta.analytics_synced_at)}, so protocol figures are as of then.`]
      : []),
    ...(meta.explorer_indexed_at && lagging(meta, meta.explorer_indexed_at)
      ? [`The Arch Explorer last indexed a block at ${fmtTs(meta.explorer_indexed_at)}, so chain and token figures are as of then.`]
      : []),
    ...(meta.analytics_replaying
      ? ['Arch Prime Analytics is rebuilding part of its history, so some figures may be incomplete until it finishes.']
      : []),
    ...(data.meta.degraded.includes('explorer')
      ? ['The Arch Explorer did not answer, so chain and token figures are left out until the next refresh.']
      : []),
  ]
  if (notices.length === 0) return null
  return (
    <div className="mb-4 space-y-2">
      {notices.map((n) => (
        <p key={n} className="note">
          {n}
        </p>
      ))}
    </div>
  )
}
