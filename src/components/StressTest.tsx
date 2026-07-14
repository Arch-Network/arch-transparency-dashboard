import type { Loan, RiskParams } from '../types'
import { colors } from '../theme'
import { fmtUsd } from '../lib/format'

interface Props {
  loans: Loan[]
  params: RiskParams
}

export function stressRow(loans: Loan[], params: RiskParams, shock: number) {
  const factor = 1 + shock / 100
  const crossing = loans.filter((l) => l.ltv_pct / factor >= params.lltv_pct)
  const collateralAtRiskUsd = crossing.reduce((a, l) => a + l.debt_usd / (l.ltv_pct / 100), 0)
  const debtAtRisk = crossing.reduce((a, l) => a + l.debt_usd, 0)
  return { shock, count: crossing.length, collateralAtRiskUsd, debtAtRisk }
}

/** Price-Shock Stress Test (master §8.7): −10% / −20% / −30% BTC drawdown —
 * loans crossing LLTV and collateral at risk, computed from the live loan book. */
export default function StressTest({ loans, params }: Props) {
  const rows = [-10, -20, -30].map((s) => stressRow(loans, params, s))

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {rows.map((r) => (
        <div key={r.shock} className="rounded-card border border-line bg-page p-4">
          <div className="num text-lg font-semibold" style={{ color: r.shock <= -30 ? colors.red : colors.orange }}>
            {r.shock}%
          </div>
          <div className="text-[10px] uppercase tracking-wider text-ink-4">BTC price</div>
          <dl className="mt-3 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between">
              <dt className="text-ink-3">Loans</dt>
              <dd className="font-semibold">{r.count}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-3">Collateral</dt>
              <dd className="font-semibold">{fmtUsd(r.collateralAtRiskUsd)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-3">Debt affected</dt>
              <dd className="font-semibold">{fmtUsd(r.debtAtRisk)}</dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  )
}
