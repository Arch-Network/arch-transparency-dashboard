import { useCallback, useEffect, useRef, useState } from 'react'
import type { Snapshot } from '../data/snapshot'
import { fmtSpan } from '../lib/format'
import { usePageHref } from '../lib/range'
import type { PageId } from '../lib/route'
import { statusOf, type Status } from '../lib/status'
import { useDismiss } from '../lib/useDismiss'
import { ArchPrimeStackedLogo, ArchPrimeWordmark, NavIcon } from './BrandMark'
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

/**
 * Arch Prime v2 navigation shell:
 * - Desktop (`lg+`): 88px sticky left rail (stacked Arch Prime lockup, vertical
 *   icon-over-label nav tiles with brand-orange active icon, Methodology link
 *   at foot) + 62px top bar over the inset rounded canvas panel.
 * - Mobile / tablet (`< lg`): frosted sticky top header (horizontal Arch Prime
 *   mark, live data status, theme toggle) + fixed bottom tab bar.
 */
export function DesktopRail({ pages, current }: { pages: NavPage[]; current: PageId }) {
  const href = usePageHref()
  return (
    <aside
      aria-label="Primary navigation"
      className="sticky top-0 hidden h-[calc(100svh-10px)] flex-col items-center px-2 pb-3 lg:row-span-2 lg:flex"
    >
      <div className="flex h-[62px] w-full shrink-0 items-center justify-center">
        <a
          href={href('overview')}
          aria-label="Arch Prime Transparency home"
          className="inline-flex items-center justify-center rounded-[12px] p-1.5 transition-opacity hover:opacity-80"
        >
          <ArchPrimeStackedLogo className="h-auto w-10" />
        </a>
      </div>

      <nav aria-label="Sections" className="mt-1 flex w-full flex-col gap-1">
        {pages.map((p) => {
          const active = current === p.id
          return (
            <a
              key={p.id}
              href={href(p.id)}
              aria-current={active ? 'page' : undefined}
              className={
                'group flex h-16 w-full flex-col items-center justify-center gap-1 rounded-[14px] px-1 text-center transition-colors duration-150 ' +
                (active
                  ? 'text-ink hover:bg-brand-soft'
                  : 'text-ink-2 hover:bg-soft hover:text-ink')
              }
            >
              <span
                className={
                  'grid size-6 place-items-center transition-colors duration-150 ' +
                  (active ? 'text-brand' : 'text-ink-2 group-hover:text-ink')
                }
              >
                <NavIcon id={p.id} className="size-[22px]" />
              </span>
              <span className="text-[11px] font-medium leading-[1.15] tracking-[0.005em]">{p.label}</span>
            </a>
          )
        })}
      </nav>

      <div className="mt-auto flex w-full flex-col items-center gap-1 pt-4">
        <a
          href={href('methodology')}
          aria-current={current === 'methodology' ? 'page' : undefined}
          className={
            'group flex h-14 w-full flex-col items-center justify-center gap-1 rounded-[14px] px-1 text-center transition-colors duration-150 ' +
            (current === 'methodology'
              ? 'text-ink hover:bg-brand-soft'
              : 'text-ink-3 hover:bg-soft hover:text-ink')
          }
        >
          <span
            className={
              'grid size-5 place-items-center transition-colors duration-150 ' +
              (current === 'methodology' ? 'text-brand' : 'text-ink-3 group-hover:text-ink')
            }
          >
            <NavIcon id="methodology" className="size-[19px]" />
          </span>
          <span className="text-[10.5px] font-medium leading-[1.15]">Docs</span>
        </a>
      </div>
    </aside>
  )
}

/** Desktop top chrome bar (sits in the white/black outer frame above the rounded canvas). */
export function DesktopTopBar({ data, error }: { data: Snapshot | null; error: string | null }) {
  const network = data?.meta.network
  return (
    <div className="hidden h-[62px] items-center justify-between gap-4 px-2 pt-[10px] pb-[10px] lg:col-start-2 lg:row-start-1 lg:flex">
      <div className="flex items-center gap-2.5 pl-1">
        <span className="font-heading text-[14px] font-medium tracking-[-0.01em] text-ink">
          Transparency
        </span>
        {network && (
          <span className="inline-flex h-[22px] items-center rounded-pill bg-soft px-2.5 text-[11.5px] font-medium capitalize text-ink-2">
            {network}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <DataStatus data={data} error={error} />
        <ThemeToggle />
      </div>
    </div>
  )
}

/** Mobile/tablet sticky header (`< lg`). */
export default function Header({ pages, current, data, error }: Props) {
  const href = usePageHref()
  return (
    <>
      <header className="chrome-frosted sticky top-0 z-40 border-b border-line lg:hidden">
        <div className="relative mx-auto flex h-14 items-center justify-between gap-2 px-4 sm:px-6">
          <a href={href('overview')} className="inline-flex shrink-0 items-center">
            <ArchPrimeWordmark />
          </a>

          <div className="flex items-center gap-1">
            <DataStatus data={data} error={error} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Fixed bottom navigation bar on mobile/tablet, matching arch-prime's mobile TabBar. */}
      <nav
        aria-label="Sections"
        className="chrome-frosted fixed inset-x-0 bottom-0 z-40 border-t border-line lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1.5">
          {pages.map((p) => {
            const active = current === p.id
            return (
              <a
                key={p.id}
                href={href(p.id)}
                aria-current={active ? 'page' : undefined}
                className={
                  'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[12px] px-0.5 py-1 text-center transition-colors ' +
                  (active ? 'text-ink' : 'text-ink-3 hover:text-ink')
                }
              >
                <span className={active ? 'text-brand' : 'text-ink-3'}>
                  <NavIcon id={p.id} className="size-5" />
                </span>
                <span className="max-w-full truncate text-[10.5px] font-medium leading-tight sm:text-[11px]">{p.label}</span>
              </a>
            )
          })}
        </div>
      </nav>
    </>
  )
}

const STATUS_LABEL: Record<Status, string> = {
  live: 'Live',
  delayed: 'Delayed',
  stale: 'Stale',
  loading: 'Loading',
}

/** The reader's clock, re-read every `everyMs`. */
function useNow(everyMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(timer)
  }, [everyMs])
  return now
}

/** Compact status pill showing snapshot freshness; opens the floating SourceAges popover. */
function DataStatus({ data, error }: { data: Snapshot | null; error: string | null }) {
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

  const mark = (
    <span className={'inline-flex items-center gap-1.5 font-medium ' + textTone}>
      <span aria-hidden="true" className={'inline-block size-[7px] shrink-0 rounded-full ' + dotTone} />
      {STATUS_LABEL[status]}
    </span>
  )

  if (!data) {
    return (
      <div className="inline-flex h-8 items-center rounded-pill bg-soft px-3 text-[12.5px]">
        {mark}
      </div>
    )
  }

  const age = now - Date.parse(data.meta.as_of)
  const ago = age < 60_000 ? 'under a minute ago' : `${fmtSpan(age)} ago`

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="data-status"
        onClick={() => setOpen(!open)}
        className="inline-flex h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-pill bg-soft px-3 text-[12.5px] text-ink-2 transition-colors duration-150 hover:bg-soft-2 aria-expanded:bg-soft-2"
      >
        {mark}
        <span className="num hidden text-ink-2 sm:inline">
          · <span className="hidden xl:inline">updated </span>
          {age < 60_000 ? '<1m ago' : ago}
        </span>
        <span className="sr-only sm:hidden"> · {ago}</span>
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          className={'size-3.5 text-ink-3 transition-transform duration-200 ' + (open ? 'rotate-180' : '')}
        >
          <path
            d="M4 6l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          id="data-status"
          role="region"
          aria-label="Data sources and their age"
          className="popover fixed right-4 top-16 z-50 w-[min(24rem,calc(100vw-2rem))] lg:absolute lg:right-0 lg:top-full lg:mt-2"
        >
          <div className="mb-2.5 flex items-center justify-between border-b border-line pb-2">
            <span className="font-heading text-[13.5px] font-medium text-ink">Data freshness</span>
            <span className="text-[12px] text-ink-3 capitalize">{data.meta.network}</span>
          </div>
          <SourceAges data={data} ago={ago} />
        </div>
      )}
    </div>
  )
}
