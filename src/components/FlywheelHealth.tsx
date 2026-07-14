import type { Flywheel as FlywheelData, UtilizationDaily } from '../types'
import { colors } from '../theme'
import { fmtPct, fmtRatio } from '../lib/format'

interface Props {
  data: FlywheelData
  utilizationDaily: UtilizationDaily[]
  /** ArchUSD on-chain retention — the redistributable-yield lever. Omitted
   * when the ArchUSD flag is off. */
  archusdRetention?: { value: number; series: number[] }
}

function TrendBar({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const w = 90
  const h = 18
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const points = values
    .map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - min) / span) * (h - 4)).toFixed(1)}`)
    .join(' ')
  return (
    <svg width={w} height={h} aria-hidden="true">
      <polyline points={points} fill="none" stroke={colors.orange} strokeWidth={1.5} />
    </svg>
  )
}

/** Flywheel Health panel: six conversion ratios, each with a one-line
 * definition, 30d trend, mono value, and direction arrow. The status line is
 * earned by the ratios, not asserted. */
export default function FlywheelHealth({ data, utilizationDaily, archusdRetention }: Props) {
  const { ratios, ratios_daily } = data
  const last = <K extends keyof (typeof ratios_daily)[number]>(k: K) =>
    ratios_daily.map((r) => r[k] as number)

  // Trend = mean of the last 7 days vs. the 7 days before — robust to day noise.
  const trendOf = (series: number[]) => {
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1)
    return mean(series.slice(-7)) >= mean(series.slice(-14, -7))
  }

  const capSeries = last('capital_productivity_pct')
  const recSeries = last('recycle_rate_pct')
  const attSeries = last('attraction_ratio')
  const utilSeries = utilizationDaily.map((u) => u.utilization_pct)

  const rows = [
    {
      name: 'Capital productivity',
      def: 'annualized 30d revenue ÷ TVL',
      value: fmtPct(ratios.capital_productivity_pct),
      series: capSeries,
      up: trendOf(capSeries),
    },
    {
      name: 'Utilization',
      def: 'deployed ÷ available capital',
      value: fmtPct(ratios.utilization_pct),
      series: utilSeries,
      up: trendOf(utilSeries),
    },
    {
      name: 'Recycle rate',
      def: 'distributed ÷ revenue (30d)',
      value: fmtPct(ratios.recycle_rate_pct),
      series: recSeries,
      up: trendOf(recSeries),
    },
    {
      name: 'Attraction ratio',
      def: 'new TVL per $1 recycled — above 1× the loop reinforces',
      value: fmtRatio(ratios.attraction_ratio),
      series: attSeries,
      up: trendOf(attSeries),
    },
    {
      name: 'Net-flow streak',
      def: 'consecutive weeks of net inflow',
      value: `${ratios.positive_flow_weeks} wks`,
      series: attSeries.slice(-8),
      up: ratios.positive_flow_weeks >= 1,
    },
    ...(archusdRetention
      ? [
          {
            name: 'ArchUSD retention',
            def: 'on-chain float ÷ minted — funds redistribution',
            value: fmtPct(archusdRetention.value),
            series: archusdRetention.series,
            up: trendOf(archusdRetention.series),
          },
        ]
      : []),
  ]

  const compounding = rows.every((r) => r.up) && ratios.attraction_ratio > 1

  return (
    <div className="card flex h-full flex-col p-5">
      <h3 className="text-[15px] font-semibold text-ink">Flywheel Health</h3>
      <p className="mt-0.5 text-xs text-ink-3">Conversion ratios — does each stage feed the next.</p>
      <div className="mt-3 flex flex-1 flex-col divide-y divide-line-faint">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-3 py-3.5">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink">{r.name}</div>
              <div className="mt-0.5 text-[10.5px] leading-snug text-ink-4">{r.def}</div>
            </div>
            <TrendBar values={r.series} />
            <div className="num w-16 text-right text-sm font-semibold text-ink">{r.value}</div>
            <span className="num text-xs font-semibold" style={{ color: r.up ? colors.green : colors.red }}>
              {r.up ? '↑' : '↓'}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-line pt-3">
        <div className="text-sm font-semibold" style={{ color: compounding ? colors.orange : colors.ink }}>
          Status: {compounding ? 'Compounding' : 'Mixed'}
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-4">
          {compounding
            ? 'All six ratios trending up, trailing 30 days. Attraction attribution window: methodology pending.'
            : 'One or more ratios flat or declining this period.'}
        </p>
      </div>
    </div>
  )
}
