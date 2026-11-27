import { useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Snapshot, TvlComponentId, TvlDaily } from '../../data/snapshot'
import ChartBox from '../../components/ChartBox'
import Panel from '../../components/Panel'
import RangeToggle, { RANGES, sliceRange, type Range } from '../../components/RangeToggle'
import SourceLine from '../../components/SourceLine'
import { axisProps, chartMargin, dayAxis, gridProps, legendProps, lineProps, tooltipProps } from '../../lib/chart'
import { liveDefinitions } from '../../lib/definitions'
import { fmtDateShort, fmtUsd } from '../../lib/format'
import { analyticsLinks } from '../../lib/links'
import { colors, productColors } from '../../theme'

const PARTS: Record<TvlComponentId, { label: string; dataKey: keyof TvlDaily; color: string }> = {
  lend: { label: 'Lend liquidity', dataKey: 'lend_usd', color: productColors.lend },
  vault: { label: 'Vault assets', dataKey: 'vault_usd', color: productColors.vaults },
  swap: { label: 'Swap liquidity', dataKey: 'swap_usd', color: productColors.swap },
}

/** Row 1 of Overview's 2-column visual chart grid: TVL Over Time | Daily Volume (with cumulative overlay). */
export default function Capital({ data }: { data: Snapshot }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <TvlChart data={data} />
      <VolumeChart data={data} />
    </div>
  )
}

function TvlChart({ data }: { data: Snapshot }) {
  const { overview, series, meta } = data
  const [range, setRange] = useState<Range>('30D')
  const definition = liveDefinitions(data).tvl
  const rows = sliceRange(series.tvl_daily, range)
  const today = series.tvl_daily[series.tvl_daily.length - 1]?.date
  const leftOutUsd = overview.tvl_left_out.reduce((total, m) => total + (m.available_usd ?? 0), 0)

  return (
    <Panel
      id="tvl"
      title="TVL Over Time"
      subtitle={
        'Stacked by product: Arch Lend liquidity, vault assets, Swap liquidity.' +
        (overview.tvl_left_out.length > 0 ? ` Excludes ${fmtUsd(leftOutUsd)} unpriced.` : '')
      }
      definition={definition}
      actions={<RangeToggle value={range} onChange={setRange} options={RANGES} />}
      source={
        <SourceLine
          from="Arch Prime Analytics"
          links={[{ label: 'Daily TVL (API)', href: analyticsLinks(meta).protocolDaily('tvl') }]}
          csv={{
            filename: 'arch-prime-tvl-daily.csv',
            rows: () =>
              series.tvl_daily.map((r) => ({
                date: r.date,
                lend_usd: r.lend_usd,
                vault_usd: r.vault_usd,
                swap_usd: r.swap_usd,
                total_usd: r.lend_usd + r.vault_usd + r.swap_usd,
              })),
          }}
        />
      }
    >
      <ChartBox>
        <AreaChart data={rows} margin={chartMargin}>
          <CartesianGrid {...gridProps} />
          <XAxis {...dayAxis(rows, 'Now')} />
          <YAxis {...axisProps} tickFormatter={(v) => fmtUsd(v)} width={56} />
          <Tooltip
            {...tooltipProps}
            formatter={(v: number) => fmtUsd(v)}
            labelFormatter={(d: string) => (d === today ? `${fmtDateShort(d)} · now` : fmtDateShort(d))}
          />
          <Legend {...legendProps} />
          {overview.tvl_components.map(({ id }) => (
            <Area
              key={id}
              type="monotone"
              dataKey={PARTS[id].dataKey}
              name={PARTS[id].label}
              stackId="tvl"
              stroke={PARTS[id].color}
              strokeWidth={1.6}
              fill={PARTS[id].color}
              fillOpacity={0.88}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ChartBox>
    </Panel>
  )
}

function VolumeChart({ data }: { data: Snapshot }) {
  const { overview, series, meta } = data
  const [range, setRange] = useState<Range>('30D')
  const definition = liveDefinitions(data).volume
  const withPropAmm = overview.propamm_volume_cum_usd !== null
  const rows = sliceRange(series.volume_daily, range)
  const today = series.volume_daily[series.volume_daily.length - 1]?.date

  return (
    <Panel
      id="volume"
      title="Daily Volume"
      subtitle={
        withPropAmm
          ? 'Daily Arch Swap pools & PropAMM fills with cumulative overlay.'
          : 'Daily swap volume in Arch Swap pools with cumulative overlay.'
      }
      definition={definition}
      actions={<RangeToggle value={range} onChange={setRange} options={RANGES} />}
      source={
        <SourceLine
          from="Arch Prime Analytics"
          links={[{ label: 'Daily volume (API)', href: analyticsLinks(meta).protocolDaily('volume') }]}
          csv={{ filename: 'arch-prime-volume-daily.csv', rows: () => series.volume_daily.map((r) => ({ ...r })) }}
        />
      }
    >
      <ChartBox>
        <ComposedChart data={rows} margin={chartMargin}>
          <CartesianGrid {...gridProps} />
          <XAxis {...dayAxis(rows, 'Today')} />
          <YAxis yAxisId="d" {...axisProps} tickFormatter={(v) => fmtUsd(v)} width={52} />
          <YAxis yAxisId="c" orientation="right" {...axisProps} tickFormatter={(v) => fmtUsd(v)} width={52} />
          <Tooltip
            {...tooltipProps}
            formatter={(v: number) => fmtUsd(v)}
            labelFormatter={(d: string) => (d === today ? `${fmtDateShort(d)} · today so far` : fmtDateShort(d))}
          />
          <Legend {...legendProps} />
          <Bar
            yAxisId="d"
            dataKey="pool_usd"
            name="Pool swaps"
            stackId="v"
            fill={productColors.swap}
            radius={withPropAmm ? [0, 0, 0, 0] : [3, 3, 0, 0]}
            isAnimationActive={false}
          />
          {withPropAmm && (
            <Bar
              yAxisId="d"
              dataKey="propamm_usd"
              name="PropAMM fills"
              stackId="v"
              fill={productColors.perps}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          )}
          <Line
            yAxisId="c"
            dataKey="cumulative_usd"
            name="Cumulative"
            stroke={colors.ink}
            {...lineProps}
          />
        </ComposedChart>
      </ChartBox>
    </Panel>
  )
}
