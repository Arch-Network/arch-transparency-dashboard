import type { ReactNode } from 'react'
import { useState } from 'react'
import RangeToggle, { type Range } from './RangeToggle'
import InfoTooltip from './InfoTooltip'

interface Props {
  title: string
  subtitle?: string
  tooltip?: string
  onMethodology?: () => void
  withRange?: boolean
  actions?: ReactNode
  chipLabel?: string
  children: (range: Range) => ReactNode
}

/** The mock-era chart card, with a range of its own. Used by the dormant
 * Revenue & Flywheel tab only; the live pages use `Panel`. */
export default function ChartPanel({
  title,
  subtitle,
  tooltip,
  onMethodology,
  withRange,
  actions,
  chipLabel,
  children,
}: Props) {
  const [range, setRange] = useState<Range>('30D')
  return (
    <section className="card min-w-0 p-4">
      <div className="flex flex-wrap items-center gap-x-0.5 gap-y-2">
        <h3 className="text-[15px] font-medium">{title}</h3>
        {tooltip && onMethodology && (
          <InfoTooltip text={tooltip}>
            <button type="button" className="link text-ink" onClick={onMethodology}>
              Definitions: see Methodology.
            </button>
          </InfoTooltip>
        )}
        {chipLabel && <span className="chip">{chipLabel}</span>}
        {(actions || withRange) && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {actions}
            {withRange && <RangeToggle value={range} onChange={setRange} />}
          </div>
        )}
      </div>
      {subtitle && <p className="mt-0.5 text-[13px] text-ink-2">{subtitle}</p>}
      <div className="mt-3">{children(range)}</div>
    </section>
  )
}
