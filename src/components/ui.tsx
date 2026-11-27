import type { ReactNode } from 'react'

/**
 * Reusable Arch Prime design primitives.
 *
 * Designed so both existing tabs and upcoming sibling integrations (Perps,
 * Theya/reserves) drop straight into the exact same visual system without
 * duplicating tokens or layout styles.
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

/** Pill status badge matching arch-prime's `.ap-badge`. */
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
        `inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 text-[12px] font-medium ` +
        `${BADGE_TONE[tone]} ${className}`
      }
    >
      {children}
    </span>
  )
}

/**
 * Arch Prime KPI strip (`.ap-stats` / `.mkd-kpis`): one flat rounded-card
 * surface whose headline metrics are separated by quiet internal hairlines
 * rather than bordered boxes or outer rules.
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
        : 'grid-cols-2 lg:grid-cols-4'

  return (
    <section
      className={
        `card grid ${cols} overflow-hidden ` +
        `[&>*]:p-5 sm:[&>*]:p-6 ` +
        `[&>*]:border-line max-lg:[&>*:nth-child(n+3)]:border-t max-lg:[&>*:nth-child(even)]:border-l ` +
        `lg:[&>*+*]:border-l ${className}`
      }
    >
      {children}
    </section>
  )
}

/**
 * Edge-to-edge key/value rows inside a Panel (`.pf-kvs` / `.ap-list`).
 * Row dividers bleed to the card's left and right edges.
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
    <dl className={`divide-y divide-line text-[13.5px] ${bleed ? '-mx-5 sm:-mx-6' : ''} ${className}`}>
      {rows.map((r, i) => (
        <div
          key={typeof r.label === 'string' ? r.label : i}
          className={`flex items-baseline justify-between gap-4 py-3 ${bleed ? 'px-5 sm:px-6' : ''}`}
        >
          <dt className="text-ink-2">{r.label}</dt>
          <dd className={`num text-right font-medium ${toneClass(r.tone)}`}>
            {r.value}
            {r.sub && <span className="block font-sans text-[12px] font-normal text-ink-3">{r.sub}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** Smooth rounded horizontal bar matching arch-prime's `.ap-gauge` / `.pf-rbar-track`. */
export function ProgressBar({
  pct,
  color = 'var(--ap-series-2)',
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

/** Shimmer skeleton bar matching arch-prime's `.ap-sk`. */
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
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      {title && <p className="font-heading text-[15px] font-medium text-ink">{title}</p>}
      <p className={`max-w-md text-[13.5px] leading-relaxed text-ink-2 ${title ? 'mt-1' : ''}`}>{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
