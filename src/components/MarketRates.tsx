import { useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import type { Market, SnapshotMeta } from '../data/snapshot'
import { axisProps, chartMargin, dayAxis, gridProps, legendProps, lineProps, tooltipProps } from '../lib/chart'
import { definitions } from '../lib/definitions'
import { fmtDateShort, fmtPct } from '../lib/format'
import { analyticsLinks } from '../lib/links'
import { useRange } from '../lib/range'
import { colors, palette } from '../theme'
import ChartBox from './ChartBox'
import Panel from './Panel'
import RateModel from './RateModel'
import { sliceRange } from './RangeToggle'
import Segmented from './Segmented'
import SourceLine from './SourceLine'

interface Props {
  /** Markets with a rate history: the ones with debt outstanding. */
  markets: Market[]
  meta: SnapshotMeta
}

const pctTick = (v: number) => `${v}%`
/** The same on both charts, so their date axes line up. */
const AXIS_WIDTH = 44

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

/** For one market, chosen with the picker: utilization and rates over time
 * on a shared date axis, and the interest rate model beside them. */
export default function MarketRates({ markets, meta }: Props) {
  const [address, setAddress] = useState(markets[0]?.address)
  const { range } = useRange()
  const market = markets.find((m) => m.address === address) ?? markets[0]
  if (!market) return null

  const api = analyticsLinks(meta)
  const rows = sliceRange(market.rates_daily, range)
  const optimal = market.optimal_utilization_pct

  return (
    <div id="rates" className="grid scroll-mt-28 grid-cols-1 gap-3 lg:grid-cols-2">
      <Panel
        title={`${market.symbol} utilization and rates`}
        subtitle="Each day’s time-weighted average"
        definition={definitions.utilization}
        actions={
          markets.length > 1 && (
            <Segmented
              label="Market"
              value={market.address}
              onChange={setAddress}
              options={markets.map((m) => ({ id: m.address, label: m.symbol }))}
            />
          )
        }
        source={
          <SourceLine
            from="Arch Prime Analytics"
            links={[
              { label: 'Utilization (API)', href: api.bankDaily(market.address, 'utilization') },
              { label: 'Borrow APR (API)', href: api.bankDaily(market.address, 'borrow_apr') },
              { label: 'Supply APR (API)', href: api.bankDaily(market.address, 'supply_apr') },
            ]}
            csv={{
              filename: `arch-lend-${market.symbol}-rates-daily.csv`,
              rows: () => market.rates_daily.map((r) => ({ ...r })),
            }}
          />
        }
      >
        <h4 className="subhead">
          Utilization, of 100% · now {fmtPct(market.utilization_pct)} · optimal {fmtPct(optimal, 0)}
        </h4>
        <ChartBox size="short">
          <LineChart data={rows} margin={chartMargin} syncId="market-rates">
            <CartesianGrid {...gridProps} />
            <XAxis {...dayAxis(rows)} tick={false} height={4} />
            <YAxis {...axisProps} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={pctTick} width={AXIS_WIDTH} />
            <Tooltip {...tooltipProps} formatter={(v: number) => fmtPct(v, 2)} labelFormatter={fmtDateShort} />
            <ReferenceLine y={optimal} stroke={colors.ink2} strokeDasharray="4 3" />
            <Line dataKey="utilization_pct" name="Utilization" stroke={palette[0]} {...lineProps} dot={loneDot} />
          </LineChart>
        </ChartBox>

        <h4 className="subhead mt-3">
          Rates · now borrow APR {fmtPct(market.borrow_apr_pct, 2)}, supply APR {fmtPct(market.supply_apr_pct, 2)}
        </h4>
        <ChartBox size="short">
          <LineChart data={rows} margin={chartMargin} syncId="market-rates">
            <CartesianGrid {...gridProps} />
            <XAxis {...dayAxis(rows)} />
            <YAxis {...axisProps} tickFormatter={pctTick} width={AXIS_WIDTH} />
            <Tooltip {...tooltipProps} formatter={(v: number) => fmtPct(v, 2)} labelFormatter={fmtDateShort} />
            <Legend {...legendProps} />
            <Line dataKey="borrow_apr_pct" name="Borrow APR" stroke={palette[1]} {...lineProps} />
            <Line dataKey="supply_apr_pct" name="Supply APR" stroke={palette[2]} {...lineProps} />
          </LineChart>
        </ChartBox>
      </Panel>

      <RateModel market={market} curveHref={api.bankCurve(market.address)} />
    </div>
  )
}
