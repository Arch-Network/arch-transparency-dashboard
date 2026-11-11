import type { ReactNode } from 'react'
import InfoTooltip from './InfoTooltip'

interface Props {
  label: string
  value: string
  sub?: ReactNode
  tooltip?: string
  onMethodology: () => void
  accent?: 'orange' | 'green'
  flag?: string
}

export function Delta({ pct, suffix, digits = 1 }: { pct: number; suffix?: string; digits?: number }) {
  const up = pct >= 0
  return (
    <span className={'num font-medium ' + (up ? 'text-up' : 'text-down')}>
      {up ? '↑' : '↓'} {Math.abs(pct).toFixed(digits)}%{suffix ? ` ${suffix}` : ''}
    </span>
  )
}

/** One headline figure: label, value, sub-line. Several sit side by side in one card.
 * An accent is a state: green reads as healthy, orange as a warning, marked by a dot and the value's color. */
export default function KpiCard({ label, value, sub, tooltip, onMethodology, accent, flag }: Props) {
  const tone = accent === 'green' ? 'text-up' : accent === 'orange' ? 'text-warn' : ''
  return (
    <div className="min-w-0">
      <div className={tooltip && !flag ? 'kpi-label info-room' : 'kpi-label'}>
        {label}
        {tooltip && <InfoTooltip text={tooltip} onMethodology={onMethodology} />}
        {flag && <span className="chip ml-2 align-middle">{flag}</span>}
      </div>
      <div className={'num flex items-center gap-1.5 text-xl font-medium ' + tone}>
        {accent && <span aria-hidden="true" className="inline-block size-2 shrink-0 rounded-full bg-current" />}
        {value}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}
