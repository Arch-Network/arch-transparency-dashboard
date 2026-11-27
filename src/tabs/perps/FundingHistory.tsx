import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import type { PerpsSnapshot } from '../../data/perps'
import type { SnapshotMeta } from '../../data/snapshot'
import ChartBox from '../../components/ChartBox'
import Panel from '../../components/Panel'
import Segmented from '../../components/Segmented'
import SourceLine from '../../components/SourceLine'
import { axisProps, chartMargin, gridProps, lineProps, tooltipProps } from '../../lib/chart'
import { fmtClock, fmtTs } from '../../lib/format'
import { perpsLinks } from '../../lib/links'
import { perpsDefinitions } from '../../lib/perpsDefinitions'
import { colors, productColors } from '../../theme'

type Unit = 'apr' | 'hourly'

function fmtSignedPct(n: number, digits: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '−' : ''
  return `${sign}${Math.abs(n).toFixed(digits)}%`
}

/** 5-minute funding rate history for tracked markets, with APR / hourly toggle and CSV export. */
export default function FundingHistory({ perps, meta }: { perps: PerpsSnapshot; meta: SnapshotMeta }) {
  const series = perps.funding_history
  const [selectedId, setSelectedId] = useState<string>(() => String(series[0]?.market_id ?? ''))
  const [unit, setUnit] = useState<Unit>('apr')

  if (series.length === 0) return null

  const current = series.find((s) => String(s.market_id) === selectedId) ?? series[0]
  const api = perpsLinks(meta)
  const dataKey = unit === 'apr' ? 'rate_apr_pct' : 'rate_hr_pct'
  const digits = unit === 'apr' ? 2 : 4
  const currentValue = unit === 'apr' ? current.current_apr_pct : current.current_hr_pct

  const points = current.points
  const spanLabel =
    points.length >= 2
      ? `${fmtClock(points[0].time)} to ${fmtClock(points[points.length - 1].time)} (${points.length} five-minute readings)`
      : `${points.length} reading`

  return (
    <Panel
      id="perps-funding"
      title="Funding rate history"
      subtitle={
        <>
          {current.symbol} now{' '}
          <span className="num font-medium text-ink">
            {fmtSignedPct(currentValue, digits)} {unit === 'apr' ? 'APR' : '/ hr'}
          </span>{' '}
          ({unit === 'apr' ? `${fmtSignedPct(current.current_hr_pct, 4)} / hr` : `${fmtSignedPct(current.current_apr_pct, 2)} APR`})
          {' · '}
          {spanLabel}
        </>
      }
      definition={perpsDefinitions.fundingRate}
      actions={
        <>
          {series.length > 1 && (
            <Segmented
              label="Market"
              options={series.map((s) => ({ id: String(s.market_id), label: s.symbol.replace(/-PERP$/, '') }))}
              value={String(current.market_id)}
              onChange={setSelectedId}
            />
          )}
          <Segmented
            label="Funding rate unit"
            options={[
              { id: 'apr', label: 'APR' },
              { id: 'hourly', label: '1 h' },
            ]}
            value={unit}
            onChange={setUnit}
          />
        </>
      }
      source={
        <SourceLine
          from="Arch Perps Engine"
          links={api ? [{ label: `${current.symbol} funding (API)`, href: api.funding(current.market_id) }] : []}
          csv={{
            filename: `arch-perps-funding-${current.symbol.toLowerCase()}.csv`,
            rows: () =>
              current.points.map((p) => ({
                time: p.time,
                rate_hr_pct: p.rate_hr_pct,
                rate_apr_pct: p.rate_apr_pct,
              })),
          }}
        />
      }
    >
      <ChartBox>
        <LineChart data={points} margin={chartMargin}>
          <CartesianGrid {...gridProps} />
          <XAxis
            dataKey="time"
            {...axisProps}
            minTickGap={24}
            interval="preserveStartEnd"
            tickFormatter={(iso: string) => iso.slice(11, 16)}
          />
          <YAxis
            {...axisProps}
            tickFormatter={(v: number) => fmtSignedPct(v, unit === 'apr' ? 1 : 4)}
            width={64}
          />
          <ReferenceLine y={0} stroke={colors.line2} strokeDasharray="3 3" />
          <Tooltip
            {...tooltipProps}
            labelFormatter={(iso: string) => fmtTs(iso)}
            formatter={(v: number) => [
              `${fmtSignedPct(v, digits)} ${unit === 'apr' ? 'APR' : '/ hr'}`,
              'Funding rate',
            ]}
          />
          <Line
            {...lineProps}
            dataKey={dataKey}
            name={unit === 'apr' ? 'Annualized funding' : 'Hourly funding'}
            stroke={productColors.perps}
          />
        </LineChart>
      </ChartBox>
    </Panel>
  )
}
