import { useEffect, useState } from 'react'
import type { MockData } from './types'
import mockJson from './data/mock.json'
import Overview from './tabs/Overview'
import RevenueFlywheel from './tabs/RevenueFlywheel'
import Risk from './tabs/Risk'
import ArchUsd from './tabs/ArchUsd'
import Methodology from './components/Methodology'
import { ARCHUSD_ENABLED } from './lib/flags'

const data = mockJson as MockData

type TabId = 'overview' | 'revenue' | 'risk' | 'archusd'

const tabs: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'revenue', label: 'Revenue & Flywheel' },
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
  const openMethodology = () => {
    setShowMethodology(true)
    window.scrollTo({ top: 0 })
  }

  const lastUpdated = new Date(data.meta.as_of).toISOString().replace('T', ' ').slice(0, 16)

  return (
    <div className="min-h-screen">
      {/* Persistent header — white bar, navy active pill, mono meta */}
      <header className="sticky top-0 z-20 border-b border-line-faint bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 lg:px-6">
          <a href="/" className="flex items-center">
            <img src="/arch-logo.svg" alt="Arch Network" className="h-7" />
          </a>

          <nav className="order-3 -mb-px flex w-full gap-1 overflow-x-auto md:order-none md:w-auto md:flex-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id)
                  setShowMethodology(false)
                }}
                className={
                  'whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ' +
                  (tab === t.id && !showMethodology
                    ? 'bg-navy text-white'
                    : 'text-ink-2 hover:bg-page hover:text-ink')
                }
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="ml-auto text-right font-mono text-[10px] leading-relaxed text-ink-3">
            <div className="flex items-center justify-end gap-2">
              <span className="flex items-center gap-1.5">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-green" />
                <span className="font-semibold text-ink">LIVE</span>
              </span>
              <span>{clock}</span>
              <span className="chip">DEMO DATA</span>
            </div>
            <div>
              Arch block {data.meta.arch_block.toLocaleString('en-US')} · settled to Bitcoin block{' '}
              {data.meta.btc_anchor_block.toLocaleString('en-US')}
            </div>
            <div>
              Last updated {lastUpdated} UTC · refreshes every {data.meta.refresh_minutes} min
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-4 py-6 lg:px-6">
        {showMethodology ? (
          <Methodology onBack={() => setShowMethodology(false)} />
        ) : (
          <>
            {tab === 'overview' && <Overview data={data} onMethodology={openMethodology} />}
            {tab === 'revenue' && <RevenueFlywheel data={data} onMethodology={openMethodology} />}
            {tab === 'risk' && <Risk data={data} onMethodology={openMethodology} />}
            {tab === 'archusd' && ARCHUSD_ENABLED && (
              <ArchUsd data={data} onMethodology={openMethodology} />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-line-faint py-5">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-2 px-4 text-xs text-ink-4 lg:px-6">
          <span>Demonstration data — mainnet metrics go live at launch.</span>
          <span className="flex items-center gap-3">
            <button
              type="button"
              onClick={openMethodology}
              className="font-semibold text-navy underline-offset-2 hover:underline"
            >
              Methodology
            </button>
            <span>Arch Network · settles to Bitcoin</span>
          </span>
        </div>
      </footer>
    </div>
  )
}
