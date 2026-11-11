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

/** Dense secondary stat strip: one card, smaller figures than the headline row. */
export default function StatStrip({ items, onMethodology }: Props) {
  return (
    <div className="card grid grid-cols-2 gap-x-4 gap-y-3 p-4 sm:grid-cols-4 xl:flex xl:items-start xl:justify-between">
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <div className={it.tooltip ? 'info-room text-xs text-ink-2' : 'text-xs text-ink-2'}>
            {it.label}
            {it.tooltip && <InfoTooltip text={it.tooltip} onMethodology={onMethodology} />}
          </div>
          <div className="num text-[15px] font-medium">{it.value}</div>
          {it.flag && <div className="text-xs text-warn">{it.flag}</div>}
        </div>
      ))}
    </div>
  )
}
