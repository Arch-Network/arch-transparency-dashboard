import { useState } from 'react'
import {
  ComposedChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import type { Market } from '../data/snapshot'
import { colors, palette } from '../theme'
import { fmtPct, fmtDateShort } from '../lib/format'
import { definitions } from '../lib/definitions'
import { tooltipProps, axisTick, gridProps, legendProps, lineProps } from '../lib/chart'
import ChartPanel from './ChartPanel'
import { sliceRange } from './RangeToggle'

interface Props {
  /** Markets with a rate history: the ones with debt outstanding. */
  markets: Market[]
  onMethodology: () => void
}

const pctTick = (v: number) => `${v}%`

interface DotProps {
  cx?: number
  cy?: number | null
  index: number
  points: { y: number | null }[]
  stroke?: string
}

/** Utilization has no value on a day the market held no deposits, and the
 * line breaks there. A day with a value between two without is reached by no
 * line segment, so it is drawn as a dot. */
function loneDot({ cx, cy, index, points, stroke }: DotProps) {
  const alone = cy != null && points[index - 1]?.y == null && points[index + 1]?.y == null
  return alone ? <circle key={index} cx={cx} cy={cy} r={2} fill={stroke} /> : <g key={index} />
}

/** Rate history and the interest rate curve for one market, with a market picker. */
export default function MarketRates({ markets, onMethodology }: Props) {
  const [address, setAddress] = useState(markets[0]?.address)
  const market = markets.find((m) => m.address === address) ?? markets[0]
  if (!market) return null

  const picker = markets.length > 1 && (
    <div className="segments">
      {markets.map((m) => (
        <button
          key={m.address}
          type="button"
          onClick={() => setAddress(m.address)}
          aria-pressed={m.address === market.address}
          className="segment"
        >
          {m.symbol}
        </button>
      ))}
    </div>
  )

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <ChartPanel
        title={`${market.symbol} Utilization & Rates`}
        subtitle={`Daily averages. Now: borrow APR ${fmtPct(market.borrow_apr_pct, 2)}, supply APR ${fmtPct(market.supply_apr_pct, 2)}.`}
        tooltip={definitions.utilization}
        onMethodology={onMethodology}
        withRange
        actions={picker}
      >
        {(range) => (
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={sliceRange(market.rates_daily, range)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={axisTick} minTickGap={16} />
              <YAxis tickFormatter={pctTick} tick={axisTick} width={40} />
              <Tooltip {...tooltipProps} formatter={(v: number) => fmtPct(v, 2)} labelFormatter={fmtDateShort} />
              <Legend {...legendProps} />
              <Line dataKey="utilization_pct" name="Utilization" stroke={palette[0]} {...lineProps} dot={loneDot} />
              <Line dataKey="borrow_apr_pct" name="Borrow APR" stroke={palette[1]} {...lineProps} />
              <Line dataKey="supply_apr_pct" name="Supply APR" stroke={palette[2]} {...lineProps} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartPanel>

      <ChartPanel
        title={`${market.symbol} Interest Rate Model`}
        subtitle={`Rates by utilization · optimal ${fmtPct(market.optimal_utilization_pct, 0)} · now at ${fmtPct(market.utilization_pct)}.`}
      >
        {() => (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={market.curve} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis
                dataKey="utilization_pct"
                type="number"
                domain={[0, 100]}
                tickFormatter={pctTick}
                tick={axisTick}
              />
              <YAxis tickFormatter={pctTick} tick={axisTick} width={44} />
              <Tooltip
                {...tooltipProps}
                formatter={(v: number) => fmtPct(v, 2)}
                labelFormatter={(l: number) => `Utilization ${fmtPct(l, 0)}`}
              />
              <Legend {...legendProps} />
              <ReferenceLine x={market.utilization_pct} stroke={colors.ink} strokeDasharray="4 3" strokeWidth={1.5} />
              <Line dataKey="borrow_apr_pct" name="Borrow APR" stroke={palette[1]} {...lineProps} />
              <Line dataKey="supply_apr_pct" name="Supply APR" stroke={palette[2]} {...lineProps} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartPanel>
    </div>
  )
}
