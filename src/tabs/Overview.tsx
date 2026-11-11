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
} from 'recharts'
import type { Snapshot } from '../data/snapshot'
import { colors, palette } from '../theme'
import { fmtUsd, fmtNum, fmtToken, fmtPct, fmtDateShort } from '../lib/format'
import { definitions, liveDefinitions } from '../lib/definitions'
import { tooltipProps, axisTick, gridProps, legendProps, lineProps } from '../lib/chart'
import KpiCard, { Delta } from '../components/KpiCard'
import StatStrip, { type StatItem } from '../components/StatStrip'
import ChartPanel from '../components/ChartPanel'
import { sliceRange } from '../components/RangeToggle'

interface Props {
  data: Snapshot
  onMethodology: () => void
}

const chartMargin = { top: 4, right: 8, left: 0, bottom: 0 }

export default function Overview({ data, onMethodology }: Props) {
  const { overview, series, lend, pools } = data
  const live = liveDefinitions(data)
  const withPropAmm = overview.propamm_volume_cum_usd !== null
  const credited = overview.lender_interest_method === 'credited'
  const leftOutUsd = overview.tvl_left_out.reduce((total, m) => total + (m.available_usd ?? 0), 0)

  const tvlTotals = series.tvl_daily.map((r) => r.swap_usd + r.lend_usd + r.vault_usd)
  const fundedMarkets = lend.markets.filter((m) => m.supplied_usd !== null && m.supplied_usd > 0)
  const assetRows = fundedMarkets.map((m) => ({
    symbol: m.symbol,
    supplied_usd: m.supplied_usd ?? 0,
    borrowed_usd: m.borrowed_usd ?? 0,
  }))
  const liquidityRows = [
    ...fundedMarkets.map((m) => ({ label: `${m.symbol} in Lend`, value: m.available_usd ?? 0 })),
    ...pools.map((p) => ({ label: `${p.pair} pool`, value: p.tvl_usd })),
  ]
  const liquidityMax = Math.max(...liquidityRows.map((r) => r.value), 0)

  return (
    <div className="space-y-3">
      <div className="pb-1">
        <h2 className="text-[26px] font-medium leading-tight">Overview</h2>
        <p className="mt-1 text-[13px] text-ink-2">
          Value locked, trading, lending and chain activity on Arch, read from the chain.
        </p>
      </div>

      <div className="card grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
        <KpiCard
          label="Total Value Locked"
          value={fmtUsd(overview.tvl_usd)}
          tooltip={live.tvl}
          onMethodology={onMethodology}
          sub={
            <span className="flex items-center gap-2">
              {overview.tvl_change_24h_pct !== null && <Delta pct={overview.tvl_change_24h_pct} suffix="24h" />}
              <Sparkline values={tvlTotals} />
            </span>
          }
        />
        <KpiCard
          label={withPropAmm ? 'Trading Volume (cumulative)' : 'Pool Swap Volume (cumulative)'}
          value={fmtUsd(overview.volume_cum_usd)}
          tooltip={live.volume}
          onMethodology={onMethodology}
          sub={
            <>
              <span className="block">{fmtUsd(overview.volume_24h_usd)} in the last 24h</span>
              <span className="block">
                {overview.propamm_volume_cum_usd !== null
                  ? `Pool swaps ${fmtUsd(overview.pool_volume_cum_usd)} · PropAMM fills ${fmtUsd(overview.propamm_volume_cum_usd)}`
                  : 'PropAMM fills not included'}
              </span>
            </>
          }
        />
        <KpiCard
          label="Swap Fees (cumulative)"
          value={fmtUsd(overview.swap_fees_cum_usd)}
          tooltip={definitions.swapFees}
          onMethodology={onMethodology}
          sub={<span>{fmtUsd(overview.swap_fees_24h_usd)} in the last 24h</span>}
        />
        <KpiCard
          label="Interest Earned by Lenders"
          value={fmtUsd(overview.lender_interest_cum_usd)}
          tooltip={live.lenderInterest}
          onMethodology={onMethodology}
          sub={
            <span>
              {fmtUsd(overview.lender_interest_7d_usd)} {credited ? 'credited in the last 7 days' : 'in the last 7 days, estimated'}
            </span>
          }
        />
      </div>

      <StatStrip onMethodology={onMethodology} items={statItems(data)} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartPanel
          title="TVL Over Time"
          subtitle={
            'Stacked by product: Arch Lend liquidity, vault assets, Swap liquidity.' +
            (overview.tvl_left_out.length > 0
              ? ` Not counted: ${fmtUsd(leftOutUsd)} of ${overview.tvl_left_out.map((m) => m.symbol).join(' and ')} deposits, which have no reference price.`
              : '')
          }
          tooltip={live.tvl}
          onMethodology={onMethodology}
          withRange
        >
          {(range) => (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={sliceRange(series.tvl_daily, range)} margin={chartMargin}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={axisTick} minTickGap={16} />
                <YAxis tickFormatter={(v) => fmtUsd(v)} tick={axisTick} width={54} />
                <Tooltip {...tooltipProps} formatter={(v: number) => fmtUsd(v)} labelFormatter={fmtDateShort} />
                <Legend {...legendProps} />
                <Area dataKey="lend_usd" name="Lend liquidity" stackId="1" stroke={palette[0]} fill={palette[0]} fillOpacity={0.85} isAnimationActive={false} />
                <Area dataKey="vault_usd" name="Vault assets" stackId="1" stroke={palette[1]} fill={palette[1]} fillOpacity={0.85} isAnimationActive={false} />
                <Area dataKey="swap_usd" name="Swap liquidity" stackId="1" stroke={palette[2]} fill={palette[2]} fillOpacity={0.85} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>

        <ChartPanel
          title="Daily Volume"
          subtitle={
            withPropAmm
              ? 'Arch Swap pool swaps and PropAMM fills each day, with the cumulative total of both.'
              : 'Daily swap volume in Arch Swap pools with cumulative overlay. PropAMM fills are not included.'
          }
          tooltip={live.volume}
          onMethodology={onMethodology}
          withRange
        >
          {(range) => (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={sliceRange(series.volume_daily, range)} margin={chartMargin}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={axisTick} minTickGap={16} />
                <YAxis yAxisId="d" tickFormatter={(v) => fmtUsd(v)} tick={axisTick} width={54} />
                <YAxis yAxisId="c" orientation="right" tickFormatter={(v) => fmtUsd(v)} tick={axisTick} width={54} />
                <Tooltip {...tooltipProps} formatter={(v: number) => fmtUsd(v)} labelFormatter={fmtDateShort} />
                <Legend {...legendProps} />
                <Bar yAxisId="d" dataKey="pool_usd" name="Pool swaps" stackId="v" fill={palette[0]} isAnimationActive={false} />
                {withPropAmm && (
                  <Bar yAxisId="d" dataKey="propamm_usd" name="PropAMM fills" stackId="v" fill={palette[2]} isAnimationActive={false} />
                )}
                <Line
                  yAxisId="c"
                  dataKey="cumulative_usd"
                  name={withPropAmm ? 'Cumulative, both' : 'Cumulative'}
                  stroke={palette[1]}
                  {...lineProps}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartPanel
          title="Daily Swap Fees"
          subtitle="Paid by traders on Arch Swap, before the LP and protocol split."
          tooltip={definitions.swapFees}
          onMethodology={onMethodology}
          withRange
        >
          {(range) => (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={sliceRange(series.fees_daily, range)} margin={chartMargin}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={axisTick} minTickGap={16} />
                <YAxis tickFormatter={(v) => fmtUsd(v)} tick={axisTick} width={54} />
                <Tooltip {...tooltipProps} formatter={(v: number) => fmtUsd(v)} labelFormatter={fmtDateShort} />
                <Bar dataKey="swap_fees_usd" name="Swap fees" fill={palette[0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>

        <ChartPanel
          title="Interest Earned by Lenders"
          subtitle={
            credited
              ? 'Cumulative interest credited to Arch Lend suppliers, counted on the day the program booked it.'
              : 'Estimated cumulative interest accrued to Arch Lend suppliers, through the last complete day.'
          }
          tooltip={live.lenderInterest}
          onMethodology={onMethodology}
          withRange
          actions={
            <div className="text-[13px] text-ink-2">
              Last 7d: <span className="font-medium text-ink">{fmtUsd(overview.lender_interest_7d_usd)}</span>
            </div>
          }
        >
          {(range) => (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={sliceRange(series.interest_daily, range)} margin={chartMargin}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={axisTick} minTickGap={16} />
                <YAxis tickFormatter={(v) => fmtUsd(v)} tick={axisTick} width={54} />
                <Tooltip {...tooltipProps} formatter={(v: number) => fmtUsd(v)} labelFormatter={fmtDateShort} />
                <Area dataKey="cumulative_usd" name="Cumulative interest" stroke={palette[0]} fill={palette[0]} fillOpacity={0.2} strokeWidth={1.5} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartPanel title="Supplied & Borrowed by Asset" subtitle="Every Arch Lend market holding deposits.">
          {() => (
            <ResponsiveContainer width="100%" height={Math.max(150, assetRows.length * 64)}>
              <BarChart layout="vertical" data={assetRows} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis type="number" tickFormatter={(v) => fmtUsd(v)} tick={axisTick} />
                <YAxis type="category" dataKey="symbol" tick={{ fontSize: 11, fill: colors.ink }} width={86} />
                <Tooltip {...tooltipProps} formatter={(v: number) => fmtUsd(v)} />
                <Legend {...legendProps} />
                <Bar dataKey="supplied_usd" name="Supplied" fill={palette[0]} isAnimationActive={false} />
                <Bar dataKey="borrowed_usd" name="Borrowed" fill={palette[1]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>

        <ChartPanel
          title="Available Liquidity"
          subtitle="Funds supplied and not borrowed in Arch Lend, and reserves in each Swap pool."
          tooltip={definitions.availableLiquidity}
          onMethodology={onMethodology}
        >
          {() => (
            <div className="space-y-4 pt-1">
              {liquidityRows.map((r) => (
                <div key={r.label}>
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className="text-ink-2">{r.label}</span>
                    <span className="num text-[15px] font-medium">{fmtUsd(r.value)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-soft-2">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${liquidityMax > 0 ? (r.value / liquidityMax) * 100 : 0}%`,
                        background: palette[0],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartPanel>
      </div>

      {series.tx_daily && (
        <ChartPanel title="Daily Transactions" subtitle="Transactions processed on Arch each UTC day, over the last 30 days.">
          {() => (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={series.tx_daily ?? []} margin={chartMargin}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={axisTick} minTickGap={16} />
                <YAxis tickFormatter={(v) => fmtNum(v)} tick={axisTick} width={54} />
                <Tooltip {...tooltipProps} formatter={(v: number) => v.toLocaleString('en-US')} labelFormatter={fmtDateShort} />
                <Bar dataKey="tx_count" name="Transactions" fill={palette[0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>
      )}
    </div>
  )
}

/** Secondary figures. Chain and token items drop out when the explorer is unavailable. */
function statItems(data: Snapshot): StatItem[] {
  const { lend, chain, tokens } = data
  const borrowers = liveDefinitions(data).borrowers
  const busiest = [...lend.markets].sort((a, b) => (b.borrowed_usd ?? 0) - (a.borrowed_usd ?? 0))[0]
  return [
    ...(tokens ? [{ label: 'BTC on Arch', value: fmtToken(tokens.abtc_supply, 'aBTC') }] : []),
    lend.loan_book
      ? { label: 'Accounts in Debt', value: fmtNum(lend.loan_book.accounts), tooltip: borrowers }
      : { label: 'Borrowing Accounts (all-time)', value: fmtNum(lend.borrowers), tooltip: borrowers },
    ...(chain
      ? [
          { label: 'Transactions (24h)', value: fmtNum(chain.tx_24h) },
          { label: 'Transactions (cum.)', value: fmtNum(chain.tx_total) },
        ]
      : []),
    ...(busiest
      ? [
          {
            label: `${busiest.symbol} Lending APR (supply / borrow)`,
            value: `${fmtPct(busiest.supply_apr_pct, 2)} / ${fmtPct(busiest.borrow_apr_pct, 2)}`,
          },
        ]
      : []),
    ...(chain
      ? [
          ...(chain.avg_block_time_ms !== null
            ? [{ label: 'Avg Block Time', value: `${Math.round(chain.avg_block_time_ms)} ms`, tooltip: definitions.blockTime }]
            : []),
          {
            label: 'TPS (24h avg / peak minute)',
            value: `${chain.tps_24h.toFixed(2)} / ${chain.tps_peak.toFixed(0)}`,
            tooltip: definitions.tps,
          },
          { label: 'Validators', value: String(chain.validators_active) },
        ]
      : []),
  ]
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
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
      <polyline points={points} fill="none" stroke={colors.ink2} strokeWidth={1.5} />
    </svg>
  )
}
