import type { ReactNode } from 'react'
import {
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { MockData, RevenueDaily } from '../types'
import { colors, streams } from '../theme'
import { fmtUsd, fmtDateShort, fmtNum, fmtPct } from '../lib/format'
import { tooltips } from '../lib/tooltips'
import { tooltipStyle, axisTick, legendStyle } from '../lib/chart'
import ChartPanel from '../components/ChartPanel'
import { sliceRange } from '../components/RangeToggle'
import Flywheel from '../components/Flywheel'
import BudgetFlow from '../components/BudgetFlow'
import DemoDataFootnote from '../components/DemoDataFootnote'

interface Props {
  data: MockData
  onMethodology: () => void
}

function revTotal(r: RevenueDaily) {
  return r.blockspace_usd + r.swap_usd + r.lend_spread_usd + r.liquidation_usd + r.partner_usd + r.am_usd
}

/** Numbered story step: plain-English headline, the one number that proves it,
 * content below. A reader with zero context should get the loop from the
 * headlines alone. */
function Step({
  n,
  headline,
  proof,
  proofColor,
  sub,
  children,
}: {
  n: number
  headline: string
  proof: string
  proofColor?: string
  sub: string
  children?: ReactNode
}) {
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="num mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange text-sm font-bold text-white">
            {n}
          </span>
          <div>
            <h3 className="text-base font-semibold text-ink">{headline}</h3>
            <p className="mt-0.5 max-w-[560px] text-xs leading-relaxed text-ink-3">{sub}</p>
          </div>
        </div>
        <div className="num text-2xl font-semibold" style={{ color: proofColor ?? colors.ink }}>
          {proof}
        </div>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </section>
  )
}

export default function RevenueFlywheel({ data, onMethodology }: Props) {
  const { series, budget, archusd, overview, flywheel } = data
  const { targets } = budget

  const ratesHeld = budget.funded_without_buffer_draw
  const retentionInBand =
    archusd.retention_pct >= targets.retention_band_min_pct &&
    archusd.retention_pct <= targets.retention_band_max_pct
  const bufferFull = budget.buffer.balance_usd >= budget.buffer.target_usd
  const funded = ratesHeld && retentionInBand && bufferFull

  const income30 = budget.income_30d.total_usd
  const spend30 = budget.allocations_30d.wedge_usd + budget.allocations_30d.retention_yield_usd
  const runRate = income30 * 12.17
  const tvlOf = (i: number) => {
    const r = series.tvl_daily[i]
    return r.swap_usd + r.lend_deposits_usd + r.collateral_usd
  }
  const netInflow30 = tvlOf(series.tvl_daily.length - 1) - tvlOf(0)
  const attraction = netInflow30 / Math.max(spend30, 1)

  // Daily income, two plain sources: invested reserves + fees
  const incomeDaily = series.revenue_daily.map((r, i) => ({
    date: r.date,
    reserves_usd: Math.round(
      (archusd.nav_daily[i].reserve_nav_usd * archusd.yield_daily[i].basis_apr_30d_pct) / 100 / 365,
    ),
    fees_usd: revTotal(r),
  }))
  // ARR by source — trailing 7-day average, annualized (income is reported as
  // run-rate, not daily revenue)
  const arrBySource = incomeDaily.map((_, i) => {
    const w0 = Math.max(0, i - 6)
    const win = incomeDaily.slice(w0, i + 1)
    return {
      date: incomeDaily[i].date,
      reserves_arr: Math.round((win.reduce((a, r) => a + r.reserves_usd, 0) / win.length) * 365),
      fees_arr: Math.round((win.reduce((a, r) => a + r.fees_usd, 0) / win.length) * 365),
    }
  })

  const streamTotals = streams
    .map((s) => ({
      name: s.label,
      color: s.color,
      value: series.revenue_daily.reduce((a, r) => a + (r[s.key] as number), 0),
    }))
    .sort((a, b) => b.value - a.value)

  // THE PICTURE — the four things the flywheel exists to grow, drawn together
  // (indexed to 100 at the start of the window so they share one frame), with
  // income underneath as the thing paying for the growth.
  const tvlSeries = series.tvl_daily.map((r) => ({
    date: r.date,
    v: r.swap_usd + r.lend_deposits_usd + r.collateral_usd,
  }))
  const oiSeries = series.tvl_daily.map((r, i) => ({
    date: r.date,
    v: Math.round(r.lend_deposits_usd * (series.utilization_daily[i].utilization_pct / 100)),
  }))
  const floatSeries = archusd.nav_daily.map((n) => ({ date: n.date, v: n.supply_onchain_usd }))
  // Treasury = what the network has EARNED: the rainy-day reserve + reinvested
  // surplus. (The seeded float backs circulating ArchUSD — counting it here
  // would double-count the currency line.)
  const treasurySeries = budget.surplus_daily.map((s) => ({
    date: s.date,
    v: budget.buffer.balance_usd + s.cumulative_usd,
  }))

  const growthLines = [
    { key: 'oi', label: 'Loans outstanding', series: oiSeries, color: colors.orange },
    { key: 'treasury', label: 'Network treasury (earned)', series: treasurySeries, color: colors.green },
    { key: 'float', label: 'ArchUSD in circulation', series: floatSeries, color: colors.gold },
    { key: 'tvl', label: 'Value on the chain (TVL)', series: tvlSeries, color: colors.navy },
  ]
  const pctOf = (s: { v: number }[]) => ((s[s.length - 1].v - s[0].v) / s[0].v) * 100
  const pictureData = tvlSeries.map((_, i) => {
    const row: Record<string, number | string> = { date: tvlSeries[i].date }
    for (const l of growthLines) row[l.key] = Math.round((l.series[i].v / l.series[0].v) * 1000) / 10
    return row
  })
  // Income, week by week — the fuel under the growth. Four bins; the final
  // bin absorbs the remainder days so a partial week never reads as a drop.
  const weeklyIncome: { week: string; income_usd: number }[] = []
  for (let w = 0; w < 4; w++) {
    const start = w * 7
    const end = w === 3 ? incomeDaily.length : (w + 1) * 7
    const chunk = incomeDaily.slice(start, end)
    weeklyIncome.push({
      week: `${fmtDateShort(chunk[0].date)}–${fmtDateShort(chunk[chunk.length - 1].date)}`,
      income_usd: chunk.reduce((a, r) => a + r.reserves_usd + r.fees_usd, 0),
    })
  }
  const allGrowing = growthLines.every((l) => pctOf(l.series) > 0)

  return (
    <div className="space-y-5">
      {/* Title + plain-language intro + status */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">Revenue &amp; Flywheel</h2>
          <p className="mt-0.5 max-w-[640px] text-sm leading-relaxed text-ink-3">
            Money on Arch makes money. That income pays for the best lending rates anywhere, which brings in
            more money. This page shows each step of that loop actually working — five steps, five numbers.
          </p>
        </div>
        <div className="card px-4 py-2.5 text-right">
          <div className="text-sm font-semibold" style={{ color: funded ? colors.green : colors.orange }}>
            {funded ? 'Self-funding' : 'Running on reserve'}
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-ink-4">
            {funded
              ? 'income covered every cost this month'
              : 'income fell short; the rainy-day reserve is covering'}
          </div>
        </div>
      </div>

      {/* THE PICTURE — is it working? One frame: the growth, and what pays for it. */}
      <section className="card p-5">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-ink">Is the flywheel working?</h3>
            <p className="mt-0.5 max-w-[680px] text-xs leading-relaxed text-ink-3">
              Like a country: assets and activity should grow over time. The lines are the four things the
              flywheel exists to grow. The bars underneath are the income that pays for it.
            </p>
          </div>
          <div className="num text-sm font-semibold" style={{ color: allGrowing ? colors.green : colors.orange }}>
            {allGrowing ? 'All four grew this month' : 'Not everything grew this month'}
          </div>
        </div>

        {/* Legend row with levels + growth */}
        <div className="mb-2 mt-3 grid grid-cols-2 gap-x-6 gap-y-2 lg:grid-cols-4">
          {growthLines.map((l) => (
            <div key={l.key} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: l.color }} />
              <div className="min-w-0">
                <div className="truncate text-[11px] text-ink-3">{l.label}</div>
                <div className="num text-sm font-semibold text-ink">
                  {fmtUsd(l.series[l.series.length - 1].v)}{' '}
                  <span className="text-[11px] font-semibold" style={{ color: colors.green }}>
                    +{pctOf(l.series).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* The growth lines — indexed to 100 at the start of the window */}
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={pictureData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} syncId="picture">
            <CartesianGrid stroke={colors.grid} vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={axisTick} tickLine={false} />
            <YAxis
              tickFormatter={(v) => `${v}`}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={40}
              domain={[95, 'auto']}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={fmtDateShort}
              formatter={(v: number, name: string) => [`${v.toFixed(1)} (start = 100)`, name]}
            />
            {growthLines.map((l) => (
              <Line
                key={l.key}
                isAnimationActive={false}
                type="monotone"
                dataKey={l.key}
                name={l.label}
                stroke={l.color}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
        <p className="num mt-0.5 text-[10px] text-ink-4">Indexed: start of month = 100.</p>

        {/* The fuel — income, week by week */}
        <div className="mt-3 border-t border-line-faint pt-3">
          <div className="flex items-baseline justify-between">
            <div className="text-[11px] font-medium text-ink-2">
              What paid for it — income, week by week
            </div>
            <div className="num text-sm font-semibold text-ink">
              {fmtUsd(runRate)} ARR{' '}
              <span className="text-[11px] font-semibold" style={{ color: colors.green }}>
                +{flywheel.flows.deltas_pct.revenue.toFixed(0)}% vs prior 30d
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={110}>
            <ComposedChart data={weeklyIncome} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="week" tick={axisTick} tickLine={false} />
              <YAxis tickFormatter={(v) => fmtUsd(v)} tick={axisTick} tickLine={false} axisLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmtUsd(v), 'Income']} />
              <Bar isAnimationActive={false} dataKey="income_usd" name="Income" fill={colors.slate} radius={[3, 3, 0, 0]} barSize={38} />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="mt-1 text-[10.5px] text-ink-4">
            Income funds the rates, rewards, and reinvestment that pull the lines above upward — the loop is
            explained step by step below.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS — the five-step mechanism */}
      <div className="pt-2">
        <h3 className="text-base font-semibold text-ink">How it works</h3>
        <p className="mt-0.5 text-xs text-ink-3">
          The loop behind the growth, one step at a time.
        </p>
      </div>

      {/* STEP 1 */}
      <Step
        n={1}
        headline="Money comes into Arch"
        sub="People deposit dollars to lend, post bitcoin to borrow against, and provide trading liquidity. The total is the base everything else builds on."
        proof={fmtUsd(overview.tvl_usd)}
      >
        <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-ink-3">
          <span>
            <span className="font-semibold" style={{ color: colors.green }}>
              +{fmtUsd(netInflow30)}
            </span>{' '}
            arrived in the last 30 days
          </span>
          <span className="text-ink-4">·</span>
          <span>{fmtUsd(archusd.supply_onchain_usd)} of ArchUSD in circulation, backed {fmtPct(archusd.backing_ratio_pct)}</span>
        </div>
      </Step>

      {/* STEP 2 */}
      <Step
        n={2}
        headline="The money makes money"
        sub="Most blockchains earn nothing. Arch earns two ways: reserves backing ArchUSD are invested in market-neutral strategies, and every trade, loan, and transaction pays a fee. Shown as estimated annual run-rate."
        proof={`${fmtUsd(runRate)} ARR`}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={arrBySource} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={axisTick} tickLine={false} />
                <YAxis tickFormatter={(v) => fmtUsd(v)} tick={axisTick} tickLine={false} axisLine={false} width={54} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtUsd(v)} labelFormatter={fmtDateShort} />
                <Legend wrapperStyle={legendStyle} />
                <Area isAnimationActive={false} type="monotone" dataKey="reserves_arr" name="From invested reserves (ARR)" stackId="1" stroke={colors.gold} fill={colors.gold} fillOpacity={0.8} />
                <Area isAnimationActive={false} type="monotone" dataKey="fees_arr" name="From fees (ARR)" stackId="1" stroke={colors.navy} fill={colors.navy} fillOpacity={0.8} />
              </AreaChart>
            </ResponsiveContainer>
            <p className="mt-1.5 text-[10.5px] text-ink-4">
              Reserve earnings move with market conditions ({fmtPct(archusd.basis_yield_30d_pct)} annualized
              now); fees grow with usage. Earned in the last 30 days: {fmtUsd(income30)}.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium text-ink-3">Where the fees come from (30d)</div>
            <ul className="mt-2 space-y-1.5 text-[10.5px]">
              {streamTotals.map((s) => (
                <li key={s.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
                  <span className="flex-1 text-ink-3">{s.name}</span>
                  <span className="num font-semibold">{fmtUsd(s.value)}</span>
                </li>
              ))}
              <li className="flex items-center gap-1.5 border-t border-line-faint pt-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ background: colors.gold }} />
                <span className="flex-1 text-ink-3">Invested reserves</span>
                <span className="num font-semibold">{fmtUsd(budget.income_30d.float_usd)}</span>
              </li>
            </ul>
          </div>
        </div>
      </Step>

      {/* STEP 3 */}
      <Step
        n={3}
        headline="The income pays for the best rates anywhere"
        sub="Lenders earn more here, borrowers pay less here, and dollars that stay in the system get rewarded — all paid for out of income, with a rainy-day reserve behind it."
        proof={`${fmtPct(targets.lender_apy_pct)} / ${fmtPct(targets.borrow_apr_pct)}`}
        proofColor={colors.orange}
      >
        <BudgetFlow budget={budget} archusd={archusd} />
      </Step>

      {/* STEP 4 */}
      <Step
        n={4}
        headline="The best rates bring in more money"
        sub="This is the test of the whole loop: did the spending attract more capital than it cost? Spending bought roughly ten times its cost in new deposits this month."
        proof={`${attraction.toFixed(1)}× per $1`}
        proofColor={colors.green}
      >
        <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-ink-3">
          <span>
            {fmtUsd(spend30)} spent on rates &amp; rewards →{' '}
            <span className="font-semibold" style={{ color: colors.green }}>
              {fmtUsd(netInflow30)}
            </span>{' '}
            of new money arrived (30d)
          </span>
          <span className="text-ink-4">· attribution methodology pending — see Methodology</span>
        </div>
      </Step>

      {/* STEP 5 */}
      <Step
        n={5}
        headline="What's left over is reinvested — and the loop repeats"
        sub="Income the targets don't need goes back to work inside the system, where it earns yield and grows the base. This number only goes up."
        proof={fmtUsd(budget.surplus_deployed_cum_usd)}
        proofColor={colors.green}
      >
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={budget.surplus_daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={colors.grid} vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={axisTick} tickLine={false} />
            <YAxis tickFormatter={(v) => fmtUsd(v)} tick={axisTick} tickLine={false} axisLine={false} width={54} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmtUsd(v), 'Reinvested (cumulative)']} labelFormatter={fmtDateShort} />
            <Area isAnimationActive={false} type="monotone" dataKey="cumulative_usd" stroke={colors.green} fill={colors.green} fillOpacity={0.12} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Step>

      {/* The loop at a glance */}
      <section className="card p-5">
        <h3 className="text-[15px] font-semibold text-ink">The whole loop, at a glance</h3>
        <p className="mt-0.5 text-xs text-ink-3">
          The five steps above, drawn as the cycle they form. Network value accumulates at the center.
        </p>
        <div className="mx-auto mt-2 max-w-[720px]">
          <Flywheel
            tvlUsd={overview.tvl_usd}
            incomeRunRateUsd={runRate}
            spendRunRateUsd={spend30 * 12.17}
            netInflow30dUsd={netInflow30}
            attraction={attraction}
            deltas={{
              income: flywheel.flows.deltas_pct.revenue,
              spend: flywheel.flows.deltas_pct.distributed,
              inflow: flywheel.flows.deltas_pct.net_new_capital,
            }}
          />
        </div>
      </section>

      {/* Detail for the curious: the chain business */}
      <ChartPanel
        title="Detail — The Blockspace Business"
        subtitle="Arch produces blockspace and operates a market for it. Every transaction is revenue."
        tooltip={tooltips.blockspaceFees}
        onMethodology={onMethodology}
        withRange
      >
        {(range) => (
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={sliceRange(series.blockspace_daily, range)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={colors.grid} vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={axisTick} tickLine={false} />
              <YAxis yAxisId="tx" tickFormatter={(v) => fmtNum(v)} tick={axisTick} tickLine={false} axisLine={false} width={46} />
              <YAxis yAxisId="btc" orientation="right" tickFormatter={(v) => v.toFixed(3)} tick={axisTick} tickLine={false} axisLine={false} width={50} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={fmtDateShort}
                formatter={(v: number, name: string) =>
                  name === 'Fees (BTC)' ? [v.toFixed(4) + ' BTC', name] : [fmtNum(v), name]
                }
              />
              <Legend wrapperStyle={legendStyle} />
              <Bar isAnimationActive={false} yAxisId="tx" dataKey="tx_count" name="Daily transactions" fill={colors.gold} radius={[3, 3, 0, 0]} />
              <Line isAnimationActive={false} yAxisId="btc" type="monotone" dataKey="fees_btc" name="Fees (BTC)" stroke={colors.orange} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartPanel>

      <DemoDataFootnote />
    </div>
  )
}
