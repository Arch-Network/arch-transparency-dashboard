import { useCallback, useEffect, useRef, useState } from 'react'
import type { Snapshot } from '../data/snapshot'
import { fmtSpan } from '../lib/format'
import { usePageHref } from '../lib/range'
import type { PageId } from '../lib/route'
import { statusOf, type Status } from '../lib/status'
import { useDismiss } from '../lib/useDismiss'
import SourceAges from './SourceAges'
import ThemeToggle from './ThemeToggle'

interface Props {
  pages: { id: PageId; label: string }[]
  current: PageId
  data: Snapshot | null
  error: string | null
}

/** Persistent header: logo, sections, data status, theme toggle. One row from
 * `sm` up; on phones the sections take a second row. */
export default function Header({ pages, current, data, error }: Props) {
  const href = usePageHref()
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-page">
      <div className="relative mx-auto flex min-h-14 w-[min(1440px,100%)] flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 sm:px-6">
        <a href={href('overview')} className="inline-flex shrink-0 items-center">
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
          className="order-last -m-1 flex w-full min-w-0 items-center gap-1 overflow-x-auto p-1 sm:order-none sm:w-auto"
        >
          {pages.map((p) => (
            <a
              key={p.id}
              href={href(p.id)}
              aria-current={current === p.id ? 'page' : undefined}
              className={
                'inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-control px-2.5 text-[15px] ' +
                (current === p.id ? 'bg-soft-2 font-medium text-ink' : 'text-ink-2 hover:text-ink')
              }
            >
              {p.label}
            </a>
          ))}
        </nav>

        <DataStatus data={data} error={error} />
        <ThemeToggle />
      </div>
    </header>
  )
}

const STATUS_LABEL: Record<Status, string> = { live: 'Live', delayed: 'Delayed', stale: 'Stale', loading: 'Loading' }

/** The reader's clock, re-read every `everyMs`. */
function useNow(everyMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(timer)
  }, [everyMs])
  return now
}

/** One word for how current the data is and how long ago it was assembled;
 * opens the age and build of each source. */
function DataStatus({ data, error }: { data: Snapshot | null; error: string | null }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, close, root, button)
  const now = useNow(15_000)

  const status = statusOf(data, error)
  // Green while live; amber while delayed, stale or loading.
  const tone = status === 'live' ? 'text-up' : 'text-warn'
  const mark = (
    <span className={'inline-flex items-center gap-1.5 font-medium ' + tone}>
      <span aria-hidden="true" className="inline-block size-2 shrink-0 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  )
  if (!data) return <div className="ml-auto text-[13px]">{mark}</div>

  const age = now - Date.parse(data.meta.as_of)
  return (
    <div ref={root} className="ml-auto">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="data-status"
        onClick={() => setOpen(!open)}
        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-control px-2 text-[13px] text-ink-2 hover:bg-soft-2 aria-expanded:bg-soft-2"
      >
        {mark}
        <span className="num">
          · <span className="hidden min-[440px]:inline">updated </span>
          {age < 60_000 ? 'under a minute ago' : `${fmtSpan(age)} ago`}
        </span>
        <svg viewBox="0 0 16 16" aria-hidden="true" className={'size-4 transition-transform ' + (open ? 'rotate-180' : '')}>
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div
          id="data-status"
          role="region"
          aria-label="Data sources and their age"
          // Hung from the header row, not the button, so it stays on screen on a phone.
          className="absolute right-4 top-full z-50 mt-1.5 w-[min(24rem,calc(100vw-2rem))] rounded-card border border-line-2 bg-raised p-3 sm:right-6"
        >
          <SourceAges data={data} />
        </div>
      )}
    </div>
  )
}
