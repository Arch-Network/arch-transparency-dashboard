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

/** A change in percent with its direction. Colored where up is good and down
 * is bad; `neutral` where a rise is neither, as with debt. */
export function Delta({ pct, neutral, digits = 1 }: { pct: number; neutral?: boolean; digits?: number }) {
  const up = pct >= 0
  const shown = Math.abs(pct).toFixed(digits)
  // A change that rounds to nothing has no direction to show.
  const flat = Number(shown) === 0
  const tone = neutral || flat ? 'text-ink' : up ? 'text-up' : 'text-down'
  return (
    <span className={'num font-medium ' + tone}>
      {!flat && (up ? '↑ ' : '↓ ')}
      {shown}%
    </span>
  )
}

/** One figure: label, value, what it compares to, and its qualification. */
export default function HeadlineMetric({ label, value, definition, comparison, note, size = 'headline' }: Props) {
  const scale = size === 'headline' ? 'text-[26px] leading-[1.15] sm:text-[32px]' : 'text-xl'
  return (
    <div className="min-w-0">
      <div className={definition ? 'kpi-label info-room' : 'kpi-label'}>
        {label}
        {definition && <DefinitionTip definition={definition} />}
      </div>
      <div className={`num mt-0.5 font-medium ${scale}`}>{value}</div>
      {comparison && <div className="mt-1 text-[13px] text-ink-2">{comparison}</div>}
      {note && <div className="mt-0.5 text-[13px] text-ink-2">{note}</div>}
    </div>
  )
}
