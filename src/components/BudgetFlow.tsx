import type { Budget, ArchUsd } from '../types'
import { colors } from '../theme'
import { fmtUsd, fmtPct } from '../lib/format'

interface Props {
  budget: Budget
  archusd: ArchUsd
}

/** Step 3 — where the income goes, in plain language. Each line names what
 * the money buys, shows the amount, and whether it was covered by income.
 * Formal terms (the rate wedge, retention yield, buffer) ride along as fine
 * print so the Methodology page still connects. */
export default function BudgetFlow({ budget, archusd }: Props) {
  const { income_30d, allocations_30d, buffer, targets } = budget

  const retentionInBand =
    archusd.retention_pct >= targets.retention_band_min_pct &&
    archusd.retention_pct <= targets.retention_band_max_pct
  const bufferFull = buffer.balance_usd >= buffer.target_usd

  const lines = [
    {
      name: 'Better rates, both sides',
      formal: 'the rate wedge',
      amount: allocations_30d.wedge_usd,
      color: colors.orange,
      status: budget.funded_without_buffer_draw ? 'paid from income' : 'paid from reserve',
      ok: budget.funded_without_buffer_draw,
      detail: `Lenders are paid ${fmtPct(targets.lender_apy_pct)} while borrowers pay only ${fmtPct(targets.borrow_apr_pct)}. Normally one side must lose for the other to win — here, income covers the difference.`,
    },
    {
      name: 'Rewards for keeping dollars on Arch',
      formal: 'retention yield',
      amount: allocations_30d.retention_yield_usd,
      color: colors.navy,
      status: retentionInBand
        ? `${fmtPct(archusd.retention_pct)} of dollars stayed — on target`
        : `${fmtPct(archusd.retention_pct)} of dollars stayed — below target`,
      ok: retentionInBand,
      detail: `Dollars that stay in the system keep earning for everyone. Holders of ArchUSD are paid yield so staying beats leaving. Target: ${targets.retention_band_min_pct}–${targets.retention_band_max_pct}% staying.`,
    },
    {
      name: 'A rainy-day reserve',
      formal: 'the buffer',
      amount: allocations_30d.buffer_topup_usd,
      color: colors.slate,
      status: bufferFull
        ? `${buffer.months_cover.toFixed(0)} months of cover — full`
        : `${buffer.months_cover.toFixed(1)} of ${targets.buffer_target_months} months`,
      ok: bufferFull,
      detail: `${fmtUsd(buffer.balance_usd)} set aside so rates stay steady even if income has a bad quarter. Full, so nothing was added this month.`,
    },
    {
      name: 'Reinvested in the ecosystem',
      formal: 'deployed surplus',
      amount: allocations_30d.surplus_deployed_usd,
      color: colors.green,
      status: 'compounding',
      ok: true,
      detail: 'Everything left over goes back to work inside the system — earning yield and growing the base. See step 5.',
    },
  ]
  const maxAmount = Math.max(...lines.map((l) => l.amount), 1)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex flex-col justify-center rounded-card border border-line bg-page p-5">
        <div className="text-[11px] font-medium uppercase tracking-wider text-ink-3">
          Income to allocate (est. annual)
        </div>
        <div className="num mt-1 text-3xl font-semibold text-ink">{fmtUsd(income_30d.total_usd * 12.17)}</div>
        <div className="mt-4 space-y-2.5 border-t border-line pt-3 font-mono text-xs">
          <div className="flex justify-between">
            <span className="text-ink-3">From invested reserves</span>
            <span className="font-semibold">{fmtUsd(income_30d.float_usd * 12.17)} / yr</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-3">From fees</span>
            <span className="font-semibold">{fmtUsd(income_30d.onchain_usd * 12.17)} / yr</span>
          </div>
        </div>
        <p className="mt-4 text-[10.5px] leading-relaxed text-ink-4">
          Spent in priority order, right. Every line covered by income this month — nothing drawn from the
          reserve.
        </p>
      </div>

      <div className="space-y-3 lg:col-span-2">
        {lines.map((l) => (
          <div key={l.name} className="rounded-card border border-line p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: l.color }} />
                <span className="text-sm font-semibold text-ink">{l.name}</span>
                <span
                  className="font-mono text-[10px] font-semibold"
                  style={{ color: l.ok ? colors.green : colors.red }}
                >
                  {l.status}
                </span>
              </div>
              <span className="num text-sm font-semibold">
                {fmtUsd(l.amount * 12.17)} <span className="text-[10px] font-normal text-ink-4">/ yr pace</span>
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-page">
              <div
                className="h-2 rounded-full"
                style={{ width: `${Math.max((l.amount / maxAmount) * 100, 2)}%`, background: l.color }}
              />
            </div>
            <p className="mt-1.5 text-[10.5px] text-ink-4">
              {l.detail} <span className="italic">({l.formal})</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
