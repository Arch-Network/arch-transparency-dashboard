import type { ReactNode } from 'react'
import InfoTooltip from './InfoTooltip'
import { colors } from '../theme'

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
    <span className="num font-medium" style={{ color: up ? colors.green : colors.red }}>
      {up ? '↑' : '↓'} {Math.abs(pct).toFixed(digits)}%{suffix ? ` ${suffix}` : ''}
    </span>
  )
}

export default function KpiCard({ label, value, sub, tooltip, onMethodology, accent, flag }: Props) {
  const valueColor = accent === 'orange' ? colors.orange : accent === 'green' ? colors.green : colors.ink
  return (
    <div
      className="card flex flex-col gap-1 p-4"
      style={accent === 'green' ? { borderTop: `2px solid ${colors.green}` } : undefined}
    >
      <div className="kpi-label flex items-center">
        {label}
        {tooltip && <InfoTooltip text={tooltip} onMethodology={onMethodology} />}
        {flag && <span className="chip ml-auto">{flag}</span>}
      </div>
      <div className="num text-xl font-semibold leading-tight lg:text-2xl" style={{ color: valueColor }}>
        {value}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}
