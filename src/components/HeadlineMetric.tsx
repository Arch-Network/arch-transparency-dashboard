import type { ReactNode } from 'react'
import type { Definition } from '../lib/definitions'
import { DefinitionTip } from './InfoTooltip'

interface Props {
  label: string
  value: string
  definition?: Definition
  /** What the value is measured against: a change and what it compares to. */
  comparison?: ReactNode
  /** The one qualification that belongs beside the number. */
  note?: ReactNode
  /** `headline`: one of the top KPI cards. `figure`: a supporting figure inside a panel. */
  size?: 'headline' | 'figure'
}

/**
 * A change in percent rendered cleanly with a directional arrow.
 */
export function Delta({
  pct,
  neutral,
  suffix,
  digits = 1,
}: {
  pct: number
  neutral?: boolean
  suffix?: string
  digits?: number
}) {
  const up = pct >= 0
  const shown = Math.abs(pct).toFixed(digits)
  const flat = Number(shown) === 0
  const toneClass = neutral || flat ? 'is-neutral' : up ? 'is-up' : 'is-down'
  return (
    <span className={`delta-pill ${toneClass}`}>
      {!flat && (up ? '↑' : '↓')} {shown}%{suffix ? ` ${suffix}` : ''}
    </span>
  )
}

/** Inline mini sparkline for KPI cards (echoing 9031wyb82's TVL sparkline). */
export function Sparkline({ values, stroke = 'var(--ap-series-8)' }: { values: number[]; stroke?: string }) {
  if (values.length < 2) return null
  const w = 72
  const h = 20
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const points = values
    .map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - min) / span) * (h - 4)).toFixed(1)}`)
    .join(' ')
  return (
    <svg width={w} height={h} aria-hidden="true" className="shrink-0">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * One KPI figure: crisp label, bold IBM Plex Sans tabular numeral, comparison, and concise note.
 */
export default function HeadlineMetric({ label, value, definition, comparison, note, size = 'headline' }: Props) {
  const scale =
    size === 'headline'
      ? 'text-[24px] font-semibold leading-[1.15] tracking-[-0.02em] sm:text-[26px]'
      : 'text-[18px] font-semibold leading-[1.25] tracking-[-0.015em]'

  return (
    <div className="flex min-w-0 flex-col">
      <div className={'kpi-label ' + (definition ? 'info-room' : '')}>
        {label}
        {definition && <DefinitionTip definition={definition} />}
      </div>
      <div className={`num mt-1 text-ink ${scale}`}>{value}</div>
      {(comparison || note) && (
        <div className="mt-1.5 space-y-0.5 text-[11.5px] leading-[1.4] text-ink-3">
          {comparison && <div className="flex flex-wrap items-center gap-2">{comparison}</div>}
          {note && <div className="text-ink-3">{note}</div>}
        </div>
      )}
    </div>
  )
}
