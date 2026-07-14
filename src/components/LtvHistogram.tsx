import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import type { LtvBucket, RiskParams } from '../types'
import { colors } from '../theme'
import { fmtUsd } from '../lib/format'
import { tooltipStyle } from '../lib/chart'

interface Props {
  buckets: LtvBucket[]
  params: RiskParams
}

/** LTV distribution histogram (master §3 Module 3.3): 5-point buckets 0–86,
 * navy bars, dashed orange reference lines at Max LTV and LLTV. */
export default function LtvHistogram({ buckets, params }: Props) {
  const data = buckets.map((b) => ({
    ...b,
    label: `${b.bucket_min}–${b.bucket_max}`,
  }))
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 22, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={colors.grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 9, fill: colors.inkMuted, fontFamily: 'IBM Plex Mono, monospace' }}
          tickLine={false}
          interval={1}
        />
        <YAxis
          tick={{ fontSize: 10, fill: colors.inkMuted, fontFamily: 'IBM Plex Mono, monospace' }}
          tickLine={false}
          axisLine={false}
          width={34}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number, name: string) =>
            name === 'loan_count' ? [value, 'Loans'] : [fmtUsd(value), 'Debt']
          }
          labelFormatter={(l) => `LTV ${l}%`}
        />
        <ReferenceLine
          x={`${params.max_ltv_pct - 5}–${params.max_ltv_pct}`}
          stroke={colors.orange}
          strokeDasharray="4 3"
          label={{ value: `Max LTV ${params.max_ltv_pct}%`, position: 'top', fontSize: 9, fill: colors.orange, fontFamily: 'IBM Plex Mono, monospace' }}
        />
        <ReferenceLine
          x={`${params.lltv_pct - 6}–${params.lltv_pct}`}
          stroke={colors.red}
          strokeDasharray="4 3"
          label={{ value: `LLTV ${params.lltv_pct}%`, position: 'insideTopRight', fontSize: 9, fill: colors.red, fontFamily: 'IBM Plex Mono, monospace' }}
        />
        <Bar dataKey="loan_count" fill={colors.navy} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
