import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import type { MockData } from '../types'
import { colors, streams, chainSpec, tvlColors, categoryColors } from '../theme'
import { fmtUsd, fmtNum, fmtBtc, fmtDateShort } from '../lib/format'
import { tooltips } from '../lib/tooltips'
import { tooltipStyle, axisTick, legendStyle } from '../lib/chart'
import KpiCard, { Delta } from '../components/KpiCard'
import StatStrip from '../components/StatStrip'
import ChartPanel from '../components/ChartPanel'
import { sliceRange } from '../components/RangeToggle'
import DemoDataFootnote from '../components/DemoDataFootnote'

interface Props {
  data: MockData
  onMethodology: () => void
}

export default function Overview({ data, onMethodology }: Props) {
  const { overview, series, liquidity } = data
  const revenue7d = series.revenue_daily
    .slice(-7)
    .reduce((a, r) => a + r.blockspace_usd + r.swap_usd + r.lend_spread_usd + r.liquidation_usd + r.partner_usd, 0)
  const revenuePrior7d = series.revenue_daily
    .slice(-14, -7)
    .reduce((a, r) => a + r.blockspace_usd + r.swap_usd + r.lend_spread_usd + r.liquidation_usd + r.partner_usd, 0)
  const rev7dDelta = ((revenue7d - revenuePrior7d) / revenuePrior7d) * 100

  const txCumulative = series.blockspace_daily.reduce((a, r) => a + r.tx_count, 0)
  const tpsCurrent = overview.tx_24h / 86400
  const tpsPeak = Math.max(...series.blockspace_daily.map((r) => r.tx_count)) / 86400

  const tvlWithTotal = series.tvl_daily.map((r) => ({
    ...r,
    total: r.swap_usd + r.lend_deposits_usd + r.collateral_usd,
  }))

  const liquidityRows = [
    ...liquidity.lend_available.map((a) => ({ label: `${a.asset} in Lend`, value: a.available_usd })),
    ...liquidity.swap_pools.map((p) => ({ label: `${p.pair} pool depth`, value: p.depth_usd })),
  ]
  const liqMax = Math.max(...liquidityRows.map((r) => r.value))

  return (
    <div className="space-y-5">
      {/* Tab title block */}
      <div>
        <h2 className="text-xl font-semibold text-ink">Overview</h2>
        <p className="mt-0.5 text-sm text-ink-3">
          A chain with a real business — the activity funds the network, and the network compounds the activity.
        </p>
      </div>

      {/* Module 1.1 — Hero KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Protocol Revenue (ARR est.)"
          value={fmtUsd(overview.total_revenue_usd * 12.17)}
          tooltip={tooltips.totalRevenue}
          onMethodology={onMethodology}
          sub={
            <span className="flex gap-3">
              <Delta pct={overview.revenue_change_24h_pct} suffix="24h" />
              <Delta pct={rev7dDelta} suffix="7d" />
              <span>{fmtUsd(overview.total_revenue_usd)} last 30d</span>
            </span>
          }
        />
        <KpiCard
          label="Total Value Locked"
          value={fmtUsd(overview.tvl_usd)}
          tooltip={tooltips.tvl}
          onMethodology={onMethodology}
          sub={
            <span className="flex items-center gap-2">
              <Delta pct={overview.tvl_change_24h_pct} suffix="24h" />
              <TvlSparkline values={tvlWithTotal.map((r) => r.total)} />
            </span>
          }
        />
        <KpiCard
          label="Cumulative Trading Volume"
          value={fmtUsd(overview.cumulative_volume_usd)}
          onMethodology={onMethodology}
          sub={<span>{fmtUsd(overview.volume_24h_usd)} in the last 24h</span>}
        />
        <KpiCard
          label="Yield Distributed to LPs"
          value={fmtUsd(overview.lp_yield_distributed_usd, { full: true })}
          tooltip={tooltips.lpYield}
          onMethodology={onMethodology}
          sub={<span>{fmtUsd(overview.lp_yield_7d_usd)} distributed in the last 7 days</span>}
        />
      </div>

      {/* Module 1.2 — Secondary stat strip */}
      <StatStrip
        onMethodology={onMethodology}
        items={[
          { label: 'BTC on Arch', value: fmtBtc(overview.btc_on_arch) },
          { label: 'Active Loans', value: fmtNum(overview.active_loans) },
          { label: 'Transactions (24h)', value: fmtNum(overview.tx_24h) },
          { label: 'Transactions (cum.)', value: fmtNum(txCumulative) },
          {
            label: 'Supply APY / Borrow APR',
            value: `${series.utilization_daily[series.utilization_daily.length - 1].supply_apy_pct.toFixed(1)}% / ${series.utilization_daily[series.utilization_daily.length - 1].borrow_apr_pct.toFixed(1)}%`,
            tooltip: tooltips.poolUtilization,
          },
          { label: 'Avg Block Time', value: `${overview.avg_block_time_ms} ms` },
          { label: 'TPS (current / peak)', value: `${tpsCurrent.toFixed(2)} / ${tpsPeak.toFixed(2)}` },
          { label: 'Capacity', value: `${fmtNum(chainSpec.tpsCapacity)} TPS` },
          { label: 'Validators', value: String(overview.validators) },
        ]}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Module 1.3 — TVL over time */}
        <ChartPanel
          title="TVL Over Time"
          subtitle="Stacked by product: loan collateral, Lend deposits, Swap liquidity."
          tooltip={tooltips.tvl}
          onMethodology={onMethodology}
          withRange
        >
          {(range) => (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={sliceRange(series.tvl_daily, range)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={axisTick} tickLine={false} />
                <YAxis tickFormatter={(v) => fmtUsd(v)} tick={axisTick} tickLine={false} axisLine={false} width={54} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtUsd(v)} labelFormatter={fmtDateShort} />
                <Legend wrapperStyle={legendStyle} />
                <Area type="monotone" dataKey="collateral_usd" name="Loan collateral" stackId="1" stroke={tvlColors.collateral} fill={tvlColors.collateral} fillOpacity={0.85} />
                <Area type="monotone" dataKey="lend_deposits_usd" name="Lend deposits" stackId="1" stroke={tvlColors.deposits} fill={tvlColors.deposits} fillOpacity={0.85} />
                <Area type="monotone" dataKey="swap_usd" name="Swap liquidity" stackId="1" stroke={tvlColors.swap} fill={tvlColors.swap} fillOpacity={0.85} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>

        {/* Module 1.4 — Daily volume */}
        <ChartPanel title="Daily Volume" subtitle="Daily trading volume with cumulative overlay." withRange>
          {(range) => (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={sliceRange(series.volume_daily, range)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={axisTick} tickLine={false} />
                <YAxis yAxisId="d" tickFormatter={(v) => fmtUsd(v)} tick={axisTick} tickLine={false} axisLine={false} width={50} />
                <YAxis yAxisId="c" orientation="right" tickFormatter={(v) => fmtUsd(v)} tick={axisTick} tickLine={false} axisLine={false} width={50} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtUsd(v)} labelFormatter={fmtDateShort} />
                <Legend wrapperStyle={legendStyle} />
                <Bar yAxisId="d" dataKey="volume_usd" name="Daily volume" fill={colors.gold} radius={[3, 3, 0, 0]} />
                <Line yAxisId="c" type="monotone" dataKey="cumulative_usd" name="Cumulative" stroke={colors.navy} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Module 1.5 — Daily protocol revenue (compact) */}
        <ChartPanel
          title="Daily Protocol Revenue"
          subtitle="By stream — see Revenue & Flywheel for detail."
          tooltip={tooltips.totalRevenue}
          onMethodology={onMethodology}
          withRange
        >
          {(range) => (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={sliceRange(series.revenue_daily, range)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={axisTick} tickLine={false} />
                <YAxis tickFormatter={(v) => fmtUsd(v)} tick={axisTick} tickLine={false} axisLine={false} width={50} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtUsd(v)} labelFormatter={fmtDateShort} />
                <Legend wrapperStyle={legendStyle} />
                {streams.map((s) => (
                  <Bar key={s.key} dataKey={s.key} name={s.label} stackId="r" fill={s.color} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>

        {/* Module 1.6 — Yield distributed to LPs */}
        <ChartPanel
          title="Yield Distributed to LPs"
          subtitle="Cumulative payouts to Swap LPs and Lend suppliers."
          tooltip={tooltips.lpYield}
          onMethodology={onMethodology}
          withRange
          actions={
            <div className="rounded-lg bg-page px-3 py-1.5 font-mono text-[11px]">
              Last 7d: <span className="font-semibold text-green">{fmtUsd(overview.lp_yield_7d_usd)}</span>
            </div>
          }
        >
          {(range) => (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={sliceRange(series.lp_yield_daily, range)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={axisTick} tickLine={false} />
                <YAxis tickFormatter={(v) => fmtUsd(v)} tick={axisTick} tickLine={false} axisLine={false} width={50} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtUsd(v)} labelFormatter={fmtDateShort} />
                <Area type="stepAfter" dataKey="cumulative_usd" name="Cumulative distributed" stroke={colors.navy} fill={colors.slate} fillOpacity={0.3} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Module 1.7 — Assets on Arch: deposits & borrows by category (config-driven) */}
        <ChartPanel
          title="Deposits & Borrows by Category"
          subtitle="Categories appear as assets list on Arch. Launch: BTC and Stablecoins."
        >
          {() => (
            <ResponsiveContainer width="100%" height={Math.max(150, series.assets_by_category.length * 76)}>
              <BarChart
                layout="vertical"
                data={series.assets_by_category
                  .filter((c) => c.deposited_usd > 0 || c.borrowed_usd > 0)
                  .map((c) => ({ ...c, total: c.deposited_usd + c.borrowed_usd }))}
                margin={{ top: 4, right: 70, left: 8, bottom: 0 }}
              >
                <CartesianGrid stroke={colors.grid} horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => fmtUsd(v)} tick={axisTick} tickLine={false} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: colors.ink }} width={86} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtUsd(v)} />
                <Legend wrapperStyle={legendStyle} />
                <Bar dataKey="deposited_usd" name="Deposited" stackId="a" fill={categoryColors.deposited} />
                <Bar dataKey="borrowed_usd" name="Borrowed" stackId="a" fill={categoryColors.borrowed} radius={[0, 3, 3, 0]}>
                  <LabelList dataKey="total" position="right" fontSize={11} fill={colors.ink} formatter={(v: number) => fmtUsd(v)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>

        {/* §8.2 — Available liquidity: Lend stables + Swap pool depth per pair */}
        <ChartPanel
          title="Available Liquidity"
          subtitle="Stablecoins free to borrow in Arch Lend and Swap pool depth per pair."
        >
          {() => (
            <div className="space-y-4 pt-1">
              {liquidityRows.map((r) => (
                <div key={r.label}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-ink-2">{r.label}</span>
                    <span className="num text-sm font-semibold">{fmtUsd(r.value)}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-page">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${(r.value / liqMax) * 100}%`, background: colors.orange }}
                    />
                  </div>
                </div>
              ))}
              <p className="pt-1 text-[10.5px] text-ink-4">
                Launch pairs: BTC/USDT, BTC/USDC. Borrowable assets: USDT, USDC. BTC-only collateral at launch.
              </p>
            </div>
          )}
        </ChartPanel>
      </div>

      <DemoDataFootnote />
    </div>
  )
}

function TvlSparkline({ values }: { values: number[] }) {
  const w = 72
  const h = 20
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const points = values
    .map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - min) / span) * (h - 4)).toFixed(1)}`)
    .join(' ')
  return (
    <svg width={w} height={h} aria-hidden="true">
      <polyline points={points} fill="none" stroke={colors.slate} strokeWidth={1.5} />
    </svg>
  )
}
