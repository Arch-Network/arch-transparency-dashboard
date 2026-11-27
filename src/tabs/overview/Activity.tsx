import { useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import type { Snapshot } from '../../data/snapshot'
import ChartBox from '../../components/ChartBox'
import Panel from '../../components/Panel'
import RangeToggle, { RANGES, sliceRange, type Range } from '../../components/RangeToggle'
import SourceLine from '../../components/SourceLine'
import { axisProps, chartMargin, dayAxis, gridProps, tooltipProps } from '../../lib/chart'
import { definitions, liveDefinitions } from '../../lib/definitions'
import { fmtDateShort, fmtUsd } from '../../lib/format'
import { analyticsLinks } from '../../lib/links'
import { productColors } from '../../theme'

/** Row 2 of Overview's 2-column visual chart grid: Daily Swap Fees | Interest Earned by Lenders. */
export default function Activity({ data }: { data: Snapshot }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <SwapFeesChart data={data} />
      <LenderInterestChart data={data} />
    </div>
  )
}

function SwapFeesChart({ data }: { data: Snapshot }) {
  const { series, meta } = data
  const [range, setRange] = useState<Range>('30D')
  const rows = sliceRange(series.fees_daily, range)
  const today = series.fees_daily[series.fees_daily.length - 1]?.date

  return (
    <Panel
      id="earnings"
      title="Daily Swap Fees"
      subtitle="Paid by traders on Arch Swap, before the LP and protocol split."
      definition={definitions.swapFees}
      actions={<RangeToggle value={range} onChange={setRange} options={RANGES} />}
      source={
        <SourceLine
          from="Arch Prime Analytics"
          links={[{ label: 'Daily fees (API)', href: analyticsLinks(meta).protocolDaily('revenue') }]}
          csv={{ filename: 'arch-prime-swap-fees-daily.csv', rows: () => series.fees_daily.map((r) => ({ ...r })) }}
        />
      }
    >
      <ChartBox>
        <BarChart data={rows} margin={chartMargin}>
          <CartesianGrid {...gridProps} />
          <XAxis {...dayAxis(rows, 'Today')} />
          <YAxis {...axisProps} tickFormatter={(v) => fmtUsd(v)} width={52} />
          <Tooltip
            {...tooltipProps}
            formatter={(v: number) => fmtUsd(v)}
            labelFormatter={(d: string) => (d === today ? `${fmtDateShort(d)} · today so far` : fmtDateShort(d))}
          />
          <Bar
            dataKey="swap_fees_usd"
            name="Swap fees"
            fill={productColors.swap}
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartBox>
    </Panel>
  )
}

function LenderInterestChart({ data }: { data: Snapshot }) {
  const { overview, series, meta } = data
  const [range, setRange] = useState<Range>('30D')
  const definition = liveDefinitions(data).lenderInterest
  const credited = overview.lender_interest_method === 'credited'
  const rows = sliceRange(series.interest_daily, range)

  return (
    <Panel
      id="lender-interest"
      title="Interest Earned by Lenders"
      subtitle={
        credited
          ? 'Cumulative interest credited to Arch Lend suppliers.'
          : 'Estimated cumulative interest accrued to Arch Lend suppliers.'
      }
      definition={definition}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-[6px] border border-line bg-inset px-2.5 py-1 font-mono text-[11px] text-ink-2">
            Last 7d: <span className="font-semibold text-up">{fmtUsd(overview.lender_interest_7d_usd)}</span>
          </div>
          <RangeToggle value={range} onChange={setRange} options={RANGES} />
        </div>
      }
      source={
        <SourceLine
          from="Arch Prime Analytics"
          links={[{ label: 'Daily interest (API)', href: analyticsLinks(meta).protocolDaily('yield') }]}
          csv={{
            filename: 'arch-prime-lender-interest-daily.csv',
            rows: () => series.interest_daily.map((r) => ({ ...r })),
          }}
        />
      }
    >
      <ChartBox>
        <AreaChart data={rows} margin={chartMargin}>
          <CartesianGrid {...gridProps} />
          <XAxis {...dayAxis(rows)} />
          <YAxis {...axisProps} tickFormatter={(v) => fmtUsd(v)} width={52} />
          <Tooltip {...tooltipProps} formatter={(v: number) => fmtUsd(v)} labelFormatter={fmtDateShort} />
          <Area
            type="monotone"
            dataKey="cumulative_usd"
            name="Cumulative interest"
            stroke={productColors.lend}
            fill={productColors.lend}
            fillOpacity={0.18}
            strokeWidth={1.75}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartBox>
    </Panel>
  )
}
