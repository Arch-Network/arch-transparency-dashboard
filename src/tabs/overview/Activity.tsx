import { useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Tooltip, XAxis, YAxis } from 'recharts'
import type { Snapshot } from '../../data/snapshot'
import ChartBox from '../../components/ChartBox'
import { DefinitionTip } from '../../components/InfoTooltip'
import Panel from '../../components/Panel'
import { sliceRange } from '../../components/RangeToggle'
import Segmented from '../../components/Segmented'
import SourceLine from '../../components/SourceLine'
import { axisProps, chartMargin, dayAxis, gridProps, legendProps, tooltipProps } from '../../lib/chart'
import { definitions, liveDefinitions, type Definition } from '../../lib/definitions'
import { fmtDateShort, fmtUsd, usdColumn } from '../../lib/format'
import { analyticsLinks } from '../../lib/links'
import { useRange } from '../../lib/range'
import { colors, productColors } from '../../theme'

// One stack per day, pools at the base. The card-colored outline leaves a hairline
// between the two venues, so the stack does not rest on hue alone.
const VENUE_BAR = { stackId: 'v', stroke: colors.card, strokeWidth: 1, isAnimationActive: false } as const

type Mode = 'daily' | 'cumulative'

/** Trading volume by venue, and what the products earned. */
export default function Activity({ data }: { data: Snapshot }) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Volume data={data} />
      <Earnings data={data} />
    </div>
  )
}

function Volume({ data }: { data: Snapshot }) {
  const { overview, series, meta } = data
  const { range } = useRange()
  const [mode, setMode] = useState<Mode>('daily')
  const definition = liveDefinitions(data).volume
  const withPropAmm = overview.propamm_volume_cum_usd !== null
  const rows = sliceRange(series.volume_daily, range)
  const today = series.volume_daily[series.volume_daily.length - 1]?.date
  const day = (d: string) => (d === today ? `${fmtDateShort(d)} · today so far` : fmtDateShort(d))
  // Today is still open: its bars are drawn lighter, so it does not read as a full day.
  const cells = rows.map((r) => <Cell key={r.date} fillOpacity={r.date === today ? 0.45 : 1} />)
  // The running total is the pools' alone, or both venues together: one product, or none.
  const total = withPropAmm ? productColors.neutral : productColors.swap

  return (
    <Panel
      id="volume"
      title={withPropAmm ? 'Trading volume' : 'Pool swap volume'}
      subtitle={
        mode === 'daily'
          ? `Each UTC day${withPropAmm ? ', by venue' : ''}. Today’s bar is the day so far.`
          : `Running total to date${withPropAmm ? ', both venues' : ''}`
      }
      definition={definition}
      actions={
        <Segmented
          label="Volume shown"
          value={mode}
          onChange={setMode}
          options={[
            { id: 'daily', label: 'Daily' },
            { id: 'cumulative', label: 'Cumulative' },
          ]}
        />
      }
      source={
        <SourceLine
          from="Arch Prime Analytics"
          links={[{ label: 'Daily volume (API)', href: analyticsLinks(meta).protocolDaily('volume') }]}
          definition={definition}
          csv={{ filename: 'arch-prime-volume-daily.csv', rows: () => series.volume_daily.map((r) => ({ ...r })) }}
        />
      }
    >
      <ChartBox>
        {mode === 'daily' ? (
          <BarChart data={rows} margin={chartMargin}>
            <CartesianGrid {...gridProps} />
            <XAxis {...dayAxis(rows, 'Today')} />
            <YAxis {...axisProps} tickFormatter={(v) => fmtUsd(v)} width={56} />
            <Tooltip {...tooltipProps} formatter={(v: number) => fmtUsd(v)} labelFormatter={day} />
            {withPropAmm && <Legend {...legendProps} />}
            <Bar dataKey="pool_usd" name="Pool swaps" fill={productColors.swap} {...VENUE_BAR}>
              {cells}
            </Bar>
            {withPropAmm && (
              <Bar dataKey="propamm_usd" name="PropAMM fills" fill={productColors.neutral} {...VENUE_BAR}>
                {cells}
              </Bar>
            )}
          </BarChart>
        ) : (
          <AreaChart data={rows} margin={chartMargin}>
            <CartesianGrid {...gridProps} />
            <XAxis {...dayAxis(rows, 'Today')} />
            <YAxis {...axisProps} tickFormatter={(v) => fmtUsd(v)} width={56} />
            <Tooltip {...tooltipProps} formatter={(v: number) => fmtUsd(v)} labelFormatter={day} />
            <Area
              dataKey="cumulative_usd"
              name="Cumulative volume"
              stroke={total}
              fill={total}
              fillOpacity={0.2}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          </AreaChart>
        )}
      </ChartBox>
    </Panel>
  )
}

function Earnings({ data }: { data: Snapshot }) {
  const { overview, meta } = data
  const api = analyticsLinks(meta)
  const interest = liveDefinitions(data).lenderInterest
  const estimated = overview.lender_interest_method === 'credited' ? '' : ', estimated'
  return (
    <Panel
      id="earnings"
      title="Earnings"
      subtitle="What traders paid in pool fees, and what Arch Lend added to lenders’ balances"
      source={
        <SourceLine
          from="Arch Prime Analytics"
          links={[
            { label: 'Daily fees (API)', href: api.protocolDaily('revenue') },
            { label: 'Daily interest (API)', href: api.protocolDaily('yield') },
          ]}
        />
      }
    >
      <div className="space-y-4">
        <Figures
          definition={definitions.swapFees}
          rows={[
            ['Last 24 h', overview.swap_fees_24h_usd],
            ['Last 30 d', overview.swap_fees_30d_usd],
            ['To date', overview.swap_fees_cum_usd],
          ]}
        />
        <Figures
          definition={interest}
          rows={[
            [`Last 7 d${estimated}`, overview.lender_interest_7d_usd],
            [`To date${estimated}`, overview.lender_interest_cum_usd],
          ]}
        />
      </div>
    </Panel>
  )
}

/** One earnings stream over a few periods. */
function Figures({ definition, rows }: { definition: Definition; rows: [string, number][] }) {
  const usd = usdColumn(rows.map(([, amount]) => amount))
  return (
    <div>
      <div className="subhead info-room">
        {definition.term}
        <DefinitionTip definition={definition} />
      </div>
      <dl className="mt-1 divide-y divide-line text-[13px]">
        {rows.map(([period, amount]) => (
          <div key={period} className="flex items-baseline justify-between gap-4 py-2">
            <dt className="text-ink-2">{period}</dt>
            <dd className="num text-[15px] font-medium">{usd(amount)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
