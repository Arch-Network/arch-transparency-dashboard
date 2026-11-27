import { useCallback, useEffect, useRef, useState } from 'react'
import type { Snapshot } from '../data/snapshot'
import { fmtSpan, fmtTs } from '../lib/format'
import { usePageHref } from '../lib/range'
import type { PageId } from '../lib/route'
import { statusOf, type Status } from '../lib/status'
import { useDismiss } from '../lib/useDismiss'
import { ArchPrimeWordmark } from './BrandMark'
import SourceAges from './SourceAges'
import ThemeToggle from './ThemeToggle'

export interface NavPage {
  id: PageId
  label: string
}

interface Props {
  pages: NavPage[]
  current: PageId
  data: Snapshot | null
  error: string | null
}

function useUtcClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now.toISOString().slice(11, 19) + ' UTC'
}

/**
 * Clean sticky top navigation bar (inspired by 9031wyb82's data-first chrome,
 * elevated with Arch Prime's wordmark, pill tabs, live freshness popover, and theme toggle).
 */
export default function Header({ pages, current, data, error }: Props) {
  const href = usePageHref()
  const clock = useUtcClock()

  return (
    <header className="chrome-frosted sticky top-0 z-40 border-b border-line">
      <div className="mx-auto flex w-[min(1320px,100%)] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 sm:px-6">
        <a
          href={href('overview')}
          aria-label="Arch Prime Transparency home"
          className="inline-flex shrink-0 items-center transition-opacity hover:opacity-80"
        >
          <ArchPrimeWordmark />
        </a>

        <nav
          aria-label="Sections"
          className="order-3 -mx-1 flex w-full items-center gap-1 overflow-x-auto px-1 pb-0.5 md:order-none md:w-auto md:pb-0"
        >
          {pages.map((p) => {
            const active = current === p.id
            return (
              <a
                key={p.id}
                href={href(p.id)}
                aria-current={active ? 'page' : undefined}
                className={
                  'inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-pill px-3.5 text-[13px] font-medium transition-colors duration-150 ' +
                  (active
                    ? 'bg-primary text-primary-ink'
                    : 'text-ink-2 hover:bg-soft hover:text-ink')
                }
              >
                {p.label}
              </a>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <DataStatus data={data} error={error} clock={clock} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

const STATUS_LABEL: Record<Status, string> = {
  live: 'LIVE',
  delayed: 'DELAYED',
  stale: 'STALE',
  loading: 'LOADING',
}

function useNow(everyMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(timer)
  }, [everyMs])
  return now
}

/** Compact live metadata block (green dot + LIVE + UTC clock + network chip + last updated)
 * that opens the SourceAges freshness popover on click. */
function DataStatus({ data, error, clock }: { data: Snapshot | null; error: string | null; clock: string }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, close, root, button)
  const now = useNow(15_000)

  const status = statusOf(data, error, now)
  const live = status === 'live'
  const dotTone = live ? 'bg-up' : 'bg-warn'
  const textTone = live ? 'text-up' : 'text-warn'

  const age = data ? now - Date.parse(data.meta.as_of) : 0
  const ago = age < 60_000 ? 'under a minute ago' : `${fmtSpan(age)} ago`

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="data-status"
        onClick={() => setOpen(!open)}
        className="group flex cursor-pointer flex-col items-end rounded-control px-2 py-1 text-right transition-colors duration-150 hover:bg-soft aria-expanded:bg-soft"
      >
        <span className="flex items-center gap-2 font-mono text-[11px] leading-none">
          <span className={'inline-flex items-center gap-1.5 font-medium tracking-[0.04em] ' + textTone}>
            <span aria-hidden="true" className={'inline-block size-1.5 shrink-0 rounded-full ' + dotTone} />
            {STATUS_LABEL[status]}
          </span>
          <span className="hidden text-ink-2 sm:inline">{clock}</span>
          {data && (
            <span className="rounded-[5px] bg-warn-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.04em] text-warn">
              {data.meta.network}
            </span>
          )}
        </span>
        {data && (
          <span className="mt-1 hidden font-mono text-[10.5px] leading-none text-ink-3 xl:inline">
            Last updated {fmtTs(data.meta.as_of)} · refreshes every {data.meta.refresh_seconds}s
          </span>
        )}
      </button>

      {open && data && (
        <div
          id="data-status"
          role="region"
          aria-label="Data sources and their age"
          className="popover fixed right-4 top-16 z-50 w-[min(24rem,calc(100vw-2rem))] sm:absolute sm:right-0 sm:top-full sm:mt-2"
        >
          <div className="mb-2.5 flex items-center justify-between border-b border-line pb-2">
            <span className="font-heading text-[13.5px] font-medium text-ink">Data freshness</span>
            <span className="text-[12px] capitalize text-ink-3">{data.meta.network}</span>
          </div>
          <SourceAges data={data} ago={ago} />
        </div>
      )}
    </div>
  )
}
