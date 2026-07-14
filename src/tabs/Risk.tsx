import {
  ComposedChart,
  BarChart,
  Bar,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import type { MockData } from '../types'
import { colors } from '../theme'
import { fmtUsd, fmtBtc, fmtPct, fmtNum, fmtDateShort, fmtTs } from '../lib/format'
import { tooltips } from '../lib/tooltips'
import { tooltipStyle, axisTick, legendStyle } from '../lib/chart'
import KpiCard from '../components/KpiCard'
import ChartPanel from '../components/ChartPanel'
import { sliceRange } from '../components/RangeToggle'
import LoanTable from '../components/LoanTable'
import LtvHistogram from '../components/LtvHistogram'
import StressTest, { stressRow } from '../components/StressTest'
import DemoDataFootnote from '../components/DemoDataFootnote'

interface Props {
  data: MockData
  onMethodology: () => void
}

export default function Risk({ data, onMethodology }: Props) {
  const { risk, series } = data
  const { params } = risk

  // Health factor per loan: collateral-to-debt buffer = 100 ÷ LTV.
  // Liquidatable below 100 ÷ LLTV ≈ 1.16 (designer reference buckets).
  const hfThreshold = 100 / params.lltv_pct
  const hfBuckets = (() => {
    const edges = [
      { label: `<${hfThreshold.toFixed(2)}`, min: 0, max: hfThreshold, warn: true },
      { label: `${hfThreshold.toFixed(2)}–1.3`, min: hfThreshold, max: 1.3, warn: false },
      { label: '1.3–1.5', min: 1.3, max: 1.5, warn: false },
      { label: '1.5–2', min: 1.5, max: 2.0, warn: false },
      { label: '2–3', min: 2.0, max: 3.0, warn: false },
      { label: '3+', min: 3.0, max: Infinity, warn: false },
    ]
    return edges.map((e) => ({
      label: e.label,
      warn: e.warn,
      count: risk.loans.filter((l) => {
        const hf = 100 / l.ltv_pct
        return hf >= e.min && hf < e.max
      }).length,
    }))
  })()

  const nearLiquidation = risk.loans.filter((l) => l.dist_to_liq_pct <= 2).length

  const top10Debt = [...risk.loans]
    .sort((a, b) => b.debt_usd - a.debt_usd)
    .slice(0, 10)
    .reduce((a, l) => a + l.debt_usd, 0)
  const top10Share = (top10Debt / risk.total_borrowed_usd) * 100

  const var20 = stressRow(risk.loans, params, -20).collateralAtRiskUsd

  // Interest rate model curve (static mechanism chart, master Module 3.5).
  const irmCurve = Array.from({ length: 101 }, (_, u) => ({
    utilization: u,
    rate:
      u <= params.target_utilization_pct
        ? 2 + (12 - 2) * (u / params.target_utilization_pct)
        : 12 + (60 - 12) * ((u - params.target_utilization_pct) / (100 - params.target_utilization_pct)),
  }))

  const latestRates = series.utilization_daily[series.utilization_daily.length - 1]

  const liqCumulative = (() => {
    let cum = 0
    return risk.liquidations.map((l) => {
      cum += l.debt_repaid_usd
      return { ts: l.ts.slice(0, 10), cumulative_usd: cum }
    })
  })()

  const insuranceCover = risk.bad_debt_usd > 0 ? risk.insurance_fund_usd / risk.bad_debt_usd : null

  return (
    <div className="space-y-5">
      {/* Tab title block */}
      <div>
        <h2 className="text-xl font-semibold text-ink">Risk</h2>
        <p className="mt-0.5 text-sm text-ink-3">
          The open loan book. Deterministic risk management is the core technical claim — this is the proof.
        </p>
      </div>

      {/* Module 3.1 — Lend health KPI rows */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Total Collateral"
          value={fmtUsd(risk.total_collateral_usd)}
          sub={<span>{fmtBtc(risk.total_collateral_btc)}</span>}
          onMethodology={onMethodology}
        />
        <KpiCard
          label="Debt Outstanding"
          value={fmtUsd(risk.total_borrowed_usd)}
          sub={<span>currently borrowed</span>}
          onMethodology={onMethodology}
        />
        <KpiCard
          label="Aggregate LTV"
          value={fmtPct(risk.aggregate_ltv_pct)}
          tooltip={tooltips.aggregateLtv}
          onMethodology={onMethodology}
          sub={<span>collateral-weighted</span>}
        />
        <KpiCard
          label="Pool Utilization"
          value={fmtPct(risk.utilization_pct)}
          tooltip={tooltips.poolUtilization}
          onMethodology={onMethodology}
          sub={<span>borrowed ÷ deposits</span>}
        />
        <KpiCard
          label="Available Liquidity"
          value={fmtUsd(risk.available_liquidity_usd)}
          sub={<span>free to borrow</span>}
          onMethodology={onMethodology}
        />
        <KpiCard
          label="Active Loans"
          value={fmtNum(risk.loans.length)}
          sub={<span>open positions</span>}
          onMethodology={onMethodology}
        />
        <KpiCard
          label="Loans Issued"
          value={fmtUsd(risk.loans_issued_cum_usd)}
          sub={<span>{fmtNum(risk.loans_issued_count)} originated</span>}
          onMethodology={onMethodology}
        />
        <KpiCard
          label="Within 2% of Liq."
          value={String(nearLiquidation)}
          accent={nearLiquidation > 0 ? 'orange' : undefined}
          sub={<span>of {risk.loans.length} loans</span>}
          onMethodology={onMethodology}
          tooltip={tooltips.distanceToLiquidation}
        />
        <KpiCard
          label="Bad Debt"
          value={fmtUsd(risk.bad_debt_usd, { full: true })}
          accent="green"
          sub={<span>{((risk.bad_debt_usd / risk.total_borrowed_usd) * 100).toFixed(2)}% of debt</span>}
          onMethodology={onMethodology}
        />
        <KpiCard
          label="Top-10 Borrower Share"
          value={fmtPct(top10Share)}
          sub={<span>debt concentration</span>}
          onMethodology={onMethodology}
        />
        <KpiCard
          label="Value at Risk (−20%)"
          value={fmtUsd(var20)}
          sub={<span>collateral liquidated</span>}
          onMethodology={onMethodology}
        />
        <KpiCard
          label="Insurance Fund"
          value={fmtUsd(risk.insurance_fund_usd)}
          flag="MOCK"
          sub={
            <span>
              {insuranceCover === null ? 'pending confirmation' : `${insuranceCover.toFixed(1)}× bad-debt cover`}
            </span>
          }
          onMethodology={onMethodology}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Module 3.2 — Risk parameters card */}
        <section className="card p-5 lg:col-span-2">
          <h3 className="text-[15px] font-semibold text-ink">Risk Parameters</h3>
          <p className="mt-0.5 text-xs text-ink-3">Arch Lend, at launch.</p>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              ['Max LTV (BTC)', `${params.max_ltv_pct}%`],
              ['Liquidation threshold (LLTV)', `${params.lltv_pct}%`],
              ['Liquidation penalty', `Dynamic, ≤ ${params.liq_penalty_max_pct}%`],
              ['Interest rate model', `Utilization curve · ${params.target_utilization_pct}% target`],
              ['Collateral', 'BTC only at launch'],
              ['Liquidation execution', 'Atomic — sells on Arch Swap'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-4 border-b border-line-faint pb-3">
                <dt className="text-ink-3">{k}</dt>
                <dd className="num text-right font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* §8.7 — Price-shock stress test */}
        <section className="card p-5 lg:col-span-3">
          <h3 className="text-[15px] font-semibold text-ink">Price-Shock Stress Test</h3>
          <p className="mt-0.5 text-xs text-ink-3">
            Loans crossing the {params.lltv_pct}% liquidation threshold under an instantaneous BTC drawdown.
          </p>
          <div className="mt-4">
            <StressTest loans={risk.loans} params={params} />
          </div>
          <p className="mt-3 text-[10.5px] text-ink-4">
            Computed from the live loan book: each open loan repriced at the shocked BTC price.
          </p>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Module 3.3 — LTV distribution */}
        <section className="card p-5">
          <h3 className="text-[15px] font-semibold text-ink">LTV Distribution</h3>
          <p className="mt-0.5 text-xs text-ink-3">
            Outstanding loans by current LTV. Reference lines: Max LTV {params.max_ltv_pct}%, LLTV {params.lltv_pct}%.
          </p>
          <div className="mt-3">
            <LtvHistogram buckets={risk.ltv_distribution} params={params} />
          </div>
        </section>

        {/* §8.7 — Health-factor distribution */}
        <section className="card p-5">
          <h3 className="text-[15px] font-semibold text-ink">Health-Factor Distribution</h3>
          <p className="mt-0.5 text-xs text-ink-3">
            Collateral-to-debt buffer. Below {hfThreshold.toFixed(2)} is liquidatable.
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={hfBuckets} margin={{ top: 22, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={colors.grid} vertical={false} />
              <XAxis dataKey="label" tick={axisTick} tickLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={30} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, 'Loans']} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                <LabelList dataKey="count" position="top" fontSize={10} fill={colors.inkMuted} fontFamily="IBM Plex Mono, monospace" />
                {hfBuckets.map((b) => (
                  <Cell key={b.label} fill={b.warn ? colors.red : colors.navy} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      {/* Module 3.4 — Loan book table */}
      <section className="card p-5">
        <h3 className="text-[15px] font-semibold text-ink">Loan Book</h3>
        <p className="mt-0.5 text-xs text-ink-3">
          All outstanding loans, anonymized. Default sort: distance to liquidation, ascending.
        </p>
        <div className="mt-4">
          <LoanTable loans={risk.loans} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Module 3.5 — Utilization & rates */}
        <ChartPanel
          title="Pool Utilization & Rates"
          tooltip={tooltips.poolUtilization}
          onMethodology={onMethodology}
          withRange
          actions={
            <div className="font-mono text-[11px] text-ink-3">
              Borrow APR <span className="font-semibold text-orange">{fmtPct(latestRates.borrow_apr_pct, 2)}</span>
              {'  '}Supply APY <span className="font-semibold text-navy">{fmtPct(latestRates.supply_apy_pct, 2)}</span>
            </div>
          }
        >
          {(range) => (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={sliceRange(series.utilization_daily, range)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={axisTick} tickLine={false} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={axisTick} tickLine={false} axisLine={false} width={40} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v.toFixed(1)}%`} labelFormatter={fmtDateShort} />
                <Legend wrapperStyle={legendStyle} />
                <Line type="monotone" dataKey="utilization_pct" name="Utilization" stroke={colors.orange} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="borrow_apr_pct" name="Borrow APR" stroke={colors.navy} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="supply_apy_pct" name="Supply APY" stroke={colors.slate} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>

        {/* Module 3.5b — IRM curve */}
        <section className="card p-5">
          <h3 className="text-[15px] font-semibold text-ink">Interest Rate Model</h3>
          <p className="mt-0.5 text-xs text-ink-3">
            Borrow APR vs. utilization · {params.target_utilization_pct}% target.
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={irmCurve} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={colors.grid} vertical={false} />
              <XAxis dataKey="utilization" tickFormatter={(v) => `${v}%`} tick={axisTick} tickLine={false} />
              <YAxis tickFormatter={(v) => `${v}%`} tick={axisTick} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [`${v.toFixed(1)}%`, 'Borrow rate']}
                labelFormatter={(l) => `Utilization ${l}%`}
              />
              <Line type="monotone" dataKey="rate" stroke={colors.navy} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      </div>

      {/* Module 3.6 — Liquidation history */}
      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-[15px] font-semibold text-ink">Liquidation History</h3>
          <span className="font-mono text-[11px] text-ink-4">Aggregate recovery target = 100%</span>
        </div>
        {risk.liquidations.length === 0 ? (
          <div className="mt-4 rounded-card border border-dashed border-line p-8 text-center">
            <p className="text-sm font-semibold text-ink">No liquidations to date</p>
            <p className="mx-auto mt-1.5 max-w-xl text-xs leading-relaxed text-ink-3">
              Every open loan sits below the {params.lltv_pct}% liquidation threshold. When a liquidation occurs,
              collateral sells on Arch Swap in the same transaction and the recovery outcome appears here.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="overflow-x-auto lg:col-span-2">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-[10px] uppercase tracking-wider text-ink-4">
                    <th className="py-2 pr-4 font-medium">Timestamp (UTC)</th>
                    <th className="py-2 pr-4 font-medium">Collateral</th>
                    <th className="py-2 pr-4 font-medium">Debt Repaid</th>
                    <th className="py-2 pr-4 font-medium">Penalty</th>
                    <th className="py-2 pr-4 font-medium">Recovery</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {risk.liquidations.map((l) => (
                    <tr key={l.ts} className="border-b border-line-faint">
                      <td className="py-2 pr-4 text-ink-3">{fmtTs(l.ts)}</td>
                      <td className="py-2 pr-4">
                        {l.collateral_btc.toFixed(4)} BTC ({fmtUsd(l.collateral_btc * data.meta.btc_price_usd)})
                      </td>
                      <td className="py-2 pr-4">{fmtUsd(l.debt_repaid_usd, { full: true })}</td>
                      <td className="py-2 pr-4">{fmtUsd(l.penalty_usd, { full: true })}</td>
                      <td className="py-2 pr-4 font-semibold" style={{ color: colors.green }}>
                        {l.recovery_pct.toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[10.5px] text-ink-4">
                Recovery at or near 100% is the proof of deterministic liquidation: collateral sells on Arch Swap in
                the same transaction that closes the loan.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Cumulative Liquidation Volume</h4>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={liqCumulative} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="ts" tickFormatter={fmtDateShort} tick={axisTick} tickLine={false} />
                  <YAxis tickFormatter={(v) => fmtUsd(v)} tick={axisTick} tickLine={false} axisLine={false} width={50} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtUsd(v)} labelFormatter={fmtDateShort} />
                  <Line type="stepAfter" dataKey="cumulative_usd" name="Debt repaid (cum.)" stroke={colors.orange} strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      <DemoDataFootnote />
    </div>
  )
}
