import type { ReactNode } from 'react'
import InfoTooltip from './InfoTooltip'

export interface StatItem {
  label: string
  value: ReactNode
  tooltip?: string
  flag?: string
}

interface Props {
  items: StatItem[]
  onMethodology: () => void
}

/** Dense secondary stat strip — small white cards, mono figures. */
export default function StatStrip({ items, onMethodology }: Props) {
  return (
    <div className="card grid grid-cols-2 gap-x-4 gap-y-3 p-4 sm:grid-cols-3 lg:flex lg:items-center lg:justify-between lg:px-6">
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <div className="flex items-center text-[11px] font-medium text-ink-3">
            {it.label}
            {it.tooltip && <InfoTooltip text={it.tooltip} onMethodology={onMethodology} />}
          </div>
          <div className="num mt-0.5 text-sm font-semibold text-ink">{it.value}</div>
          {it.flag && <div className="text-[9px] text-orange">{it.flag}</div>}
        </div>
      ))}
    </div>
  )
}
