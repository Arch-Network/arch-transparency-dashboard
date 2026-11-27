import { Children, type ReactNode } from 'react'
import type { Definition } from '../lib/definitions'
import { DefinitionTip } from './InfoTooltip'

/**
 * Reusable Arch Prime Cut #2 primitives:
 * crisp bordered individual KPI cards, dense horizontal MetricsBar,
 * clean key/value rows, smooth progress bars, and quiet empty states.
 */

export type Tone = 'neutral' | 'up' | 'down' | 'warn' | 'brand' | 'ink'

const BADGE_TONE: Record<Tone, string> = {
  neutral: 'bg-soft-2 text-ink-2',
  up: 'bg-up-soft text-up',
  down: 'bg-down-soft text-down',
  warn: 'bg-warn-soft text-warn',
  brand: 'bg-brand-soft text-brand',
  ink: 'bg-primary text-primary-ink',
}

/** Pill status badge. */
export function Badge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={
        `inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[6px] px-2 text-[11.5px] font-medium ` +
        `${BADGE_TONE[tone]} ${className}`
      }
    >
      {children}
    </span>
  )
}

/**
 * Hero KPI card row (matching 9031wyb82's 4 separate crisp white bordered KPI cards
 * with generous breathing room between them).
 */
export function StatStrip({
  children,
  columns = 4,
  className = '',
}: {
  children: ReactNode
  columns?: 2 | 3 | 4
  className?: string
}) {
  const cols =
    columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 3
        ? 'grid-cols-1 sm:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'

  return (
    <section className={`grid gap-3.5 ${cols} ${className}`}>
      {Children.map(children, (child, i) =>
        child ? (
          <div key={i} className="card flex min-w-0 flex-col justify-between p-4">
            {child}
          </div>
        ) : null,
      )}
    </section>
  )
}

export interface MetricBarItem {
  label: string
  value: ReactNode
  sub?: ReactNode
  definition?: Definition
  href?: string
}

/**
 * Dense single-row horizontal secondary stat strip directly under the Hero KPIs
 * (exact signature pattern from 9031wyb82's StatStrip).
 */
export function MetricsBar({ items, className = '' }: { items: MetricBarItem[]; className?: string }) {
  if (items.length === 0) return null
  return (
    <section
      className={`card grid grid-cols-2 gap-x-5 gap-y-3 px-4 py-3.5 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-center lg:justify-between lg:px-5 ${className}`}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <div className="flex items-center text-[11.5px] font-medium text-ink-3">
            <span className="truncate">{item.label}</span>
            {item.definition && <DefinitionTip definition={item.definition} />}
          </div>
          <div className="num mt-0.5 text-[14.5px] font-semibold leading-snug text-ink">
            {item.href ? (
              <a href={item.href} className="hover:underline">
                {item.value}
              </a>
            ) : (
              item.value
            )}
          </div>
          {item.sub && <div className="num text-[11px] text-ink-3">{item.sub}</div>}
        </div>
      ))}
    </section>
  )
}

/**
 * Edge-to-edge key/value rows inside a Panel.
 */
export function KeyValueList({
  rows,
  bleed = false,
  className = '',
}: {
  rows: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: Tone }[]
  bleed?: boolean
  className?: string
}) {
  const toneClass = (tone?: Tone) =>
    tone === 'up'
      ? 'text-up'
      : tone === 'down'
        ? 'text-down'
        : tone === 'warn'
          ? 'text-warn'
          : tone === 'brand'
            ? 'text-brand'
            : 'text-ink'

  return (
    <dl className={`divide-y divide-line text-[13px] ${bleed ? '-mx-4 sm:-mx-5' : ''} ${className}`}>
      {rows.map((r, i) => (
        <div
          key={typeof r.label === 'string' ? r.label : i}
          className={`flex items-baseline justify-between gap-4 py-2.5 ${bleed ? 'px-4 sm:px-5' : ''}`}
        >
          <dt className="text-ink-2">{r.label}</dt>
          <dd className={`num text-right font-medium ${toneClass(r.tone)}`}>
            {r.value}
            {r.sub && <span className="block font-sans text-[11.5px] font-normal text-ink-3">{r.sub}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** Smooth rounded horizontal bar. */
export function ProgressBar({
  pct,
  color = 'var(--ap-brand)',
  height = 'h-1.5',
  className = '',
}: {
  pct: number
  color?: string
  height?: string
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div className={`${height} w-full overflow-hidden rounded-pill bg-soft-2 ${className}`} aria-hidden="true">
      <div
        className="h-full rounded-pill transition-[width] duration-300 ease-ap"
        style={{ width: `${clamped}%`, background: color }}
      />
    </div>
  )
}

/** Shimmer skeleton bar. */
export function Skeleton({ className = 'h-4 w-24' }: { className?: string }) {
  return <span className={`ap-sk ${className}`} aria-hidden="true" />
}

/** Quiet empty/degraded state block inside a card. */
export function EmptyState({
  title,
  body,
  action,
}: {
  title?: string
  body: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
      {title && <p className="font-heading text-[14.5px] font-medium text-ink">{title}</p>}
      <p className={`max-w-md text-[13px] leading-relaxed text-ink-2 ${title ? 'mt-1' : ''}`}>{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
