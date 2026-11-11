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

/** Standard chart card: title row with its definition and controls, muted sub-line, then the chart. */
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
        {tooltip && onMethodology && <InfoTooltip text={tooltip} onMethodology={onMethodology} />}
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
