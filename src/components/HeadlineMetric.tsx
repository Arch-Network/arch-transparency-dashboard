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
  /** `headline`: one of the few figures a page leads with. `figure`: a supporting one. */
  size?: 'headline' | 'figure'
}

/**
 * A change in percent rendered as an Arch Prime `.ap-delta` tinted pill with a
 * subtle directional arrow when non-flat. Colored where up is good and down is
 * bad; `neutral` where a rise is neither (e.g., debt).
 */
export function Delta({ pct, neutral, digits = 1 }: { pct: number; neutral?: boolean; digits?: number }) {
  const up = pct >= 0
  const shown = Math.abs(pct).toFixed(digits)
  const flat = Number(shown) === 0
  const toneClass = neutral || flat ? 'is-neutral' : up ? 'is-up' : 'is-down'
  return (
    <span className={`delta-pill ${toneClass}`}>
      {!flat && (
        <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3 shrink-0">
          {up ? (
            <path
              d="M6 9.5V2.5M3 5.5 6 2.5l3 3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d="M6 2.5v7M3 6.5 6 9.5l3-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      )}
      {!flat && (up ? '+' : '−')}
      {shown}%
    </span>
  )
}

/**
 * One KPI figure: label, IBM Plex Sans tabular numeral, comparison pill/context,
 * and qualification. Uses subgrid when placed in a multi-row figure grid so
 * wrapped labels keep sibling figures baseline-aligned.
 */
export default function HeadlineMetric({ label, value, definition, comparison, note, size = 'headline' }: Props) {
  const scale =
    size === 'headline'
      ? 'text-[26px] leading-[1.15] tracking-[-0.02em] sm:text-[32px]'
      : 'text-[20px] leading-[1.25] tracking-[-0.012em]'

  return (
    <div className="row-span-3 grid min-w-0 grid-rows-subgrid gap-y-0">
      <div className={'self-end ' + (definition ? 'kpi-label info-room' : 'kpi-label')}>
        {label}
        {definition && <DefinitionTip definition={definition} />}
      </div>
      <div className={`num mt-1.5 font-medium text-ink ${scale}`}>{value}</div>
      <div className="text-[12.5px] leading-[1.45] text-ink-2">
        {comparison && <div className="mt-2 flex flex-wrap items-center gap-1.5">{comparison}</div>}
        {note && <div className="mt-1 text-ink-3">{note}</div>}
      </div>
    </div>
  )
}
