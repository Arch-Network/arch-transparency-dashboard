import { useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ReferenceDot, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import type { Market } from '../data/snapshot'
import { axisProps, gridProps, legendProps, lineProps, tooltipProps } from '../lib/chart'
import { fmtPct } from '../lib/format'
import { colors, palette } from '../theme'
import ChartBox from './ChartBox'
import Panel from './Panel'
import Segmented from './Segmented'
import SourceLine from './SourceLine'

type View = 'operating' | 'full'

const pctTick = (v: number) => `${v}%`
/** A label at the top of a vertical line: `insideTopLeft` sets it to the line's right, `insideTopRight` to its left. */
const label = (value: string, position: 'insideTopLeft' | 'insideTopRight') =>
  ({ value, position, fontSize: 12, fill: colors.ink2 }) as const

/** The rates the program charges and pays at each utilization, with where
 * the market is now and the utilization the model is tuned to. */
export default function RateModel({ market, curveHref }: { market: Market; curveHref: string }) {
  const [view, setView] = useState<View>('operating')
  // Served as a float a hair off the configured figure (80.00000000000007).
  const optimal = Number(market.optimal_utilization_pct.toFixed(6))
  const now = market.utilization_pct
  // Past the optimal point the rate climbs to its maximum, which flattens
  // everything before it. The operating range stops there, or at the
  // market's utilization where that is higher.
  const limit = view === 'full' ? 100 : Math.min(100, Math.ceil(Math.max(optimal, now)))
  const curve = market.curve.filter((p) => p.utilization_pct <= limit)

  return (
    <Panel
      title={`${market.symbol} interest rate model`}
      subtitle={
        view === 'operating'
          ? `Rates by utilization, over the range the market operates in. Past the optimal ${fmtPct(optimal, 0)} the borrow rate climbs to ${fmtPct(market.max_rate_pct, 0)}.`
          : `Rates by utilization: ${fmtPct(market.plateau_rate_pct, 0)} to borrow at the optimal ${fmtPct(optimal, 0)}, ${fmtPct(market.max_rate_pct, 0)} at full utilization`
      }
      actions={
        <Segmented
          label="Part of the curve shown"
          value={view}
          onChange={setView}
          options={[
            { id: 'operating', label: 'Operating range' },
            { id: 'full', label: 'Full curve' },
          ]}
        />
      }
      source={<SourceLine from="Arch Prime Analytics" links={[{ label: 'Rate curve (API)', href: curveHref }]} />}
    >
      <ChartBox size="fill">
        <LineChart data={curve} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis {...axisProps} dataKey="utilization_pct" type="number" domain={[0, limit]} tickFormatter={pctTick} />
          <YAxis {...axisProps} tickFormatter={pctTick} width={44} />
          <Tooltip
            {...tooltipProps}
            formatter={(v: number) => fmtPct(v, 2)}
            labelFormatter={(l: number) => `Utilization ${fmtPct(l, 0)}`}
          />
          <Legend {...legendProps} />
          <ReferenceLine
            x={optimal}
            stroke={colors.ink2}
            strokeDasharray="4 3"
            label={label(`Optimal ${fmtPct(optimal, 0)}`, 'insideTopRight')}
          />
          <ReferenceLine
            x={now}
            stroke={colors.ink}
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={label(`Now ${fmtPct(now)}`, 'insideTopLeft')}
          />
          <Line dataKey="borrow_apr_pct" name="Borrow APR" stroke={palette[1]} {...lineProps} />
          <Line dataKey="supply_apr_pct" name="Supply APR" stroke={palette[2]} {...lineProps} />
          <ReferenceDot x={now} y={market.borrow_apr_pct} r={3.5} fill={palette[1]} stroke={colors.card} />
          <ReferenceDot x={now} y={market.supply_apr_pct} r={3.5} fill={palette[2]} stroke={colors.card} />
        </LineChart>
      </ChartBox>
    </Panel>
  )
}
