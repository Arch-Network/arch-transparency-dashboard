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

/** Standard chart card: module header + muted sub-line + optional range toggles. */
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
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            {title}
            {tooltip && onMethodology && (
              <InfoTooltip text={tooltip} onMethodology={onMethodology} />
            )}
            {chipLabel && <span className="chip">{chipLabel}</span>}
          </h3>
          {subtitle && <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {withRange && <RangeToggle value={range} onChange={setRange} />}
        </div>
      </div>
      {children(range)}
    </section>
  )
}
