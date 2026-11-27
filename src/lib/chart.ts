import type { CSSProperties } from 'react'
import ChartLegend from '../components/ChartLegend'
import { colors, productColors } from '../theme'
import { fmtDateShort } from './format'

// Chart styling aligned with Arch-Network/arch-prime (apps/web-v2/app/ap/charts.css):
// - Quiet dashed horizontal gridlines, no vertical gridlines, no heavy axis spines
// - IBM Plex Sans tabular axis ticks in muted ink-3
// - Dark frosted-glass floating tooltip with crisp white values
// - Smooth monotone curves (2px stroke) and clean rounded bar caps

export const tooltipStyle: CSSProperties = {
  background: colors.tooltipBg,
  border: 'none',
  borderRadius: 12,
  padding: '10px 12px',
  fontSize: 12.5,
  fontFamily: 'var(--ap-font-num)',
  fontVariantNumeric: 'tabular-nums',
  color: colors.tooltipFg,
}

/** Spread onto a Recharts `Tooltip`. */
export const tooltipProps = {
  contentStyle: tooltipStyle,
  labelStyle: {
    color: colors.tooltipFg,
    fontFamily: 'var(--ap-font-sans)',
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 6,
    paddingBottom: 6,
    borderBottom: `1px solid ${colors.tooltipRule}`,
  },
  itemStyle: {
    color: colors.tooltipFg,
    fontSize: 12.5,
    fontWeight: 500,
    padding: '2px 0',
  },
  cursor: {
    stroke: colors.chartCrosshair,
    strokeDasharray: '3 3',
    fill: colors.soft,
  },
} as const

const axisTick = {
  fontSize: 11.5,
  fontWeight: 500,
  fontFamily: 'var(--ap-font-num)',
  fill: colors.ink3,
} as const

/** Spread onto every `XAxis` and `YAxis`: clean ticks with no axis spine or tick marks. */
export const axisProps = {
  tick: axisTick,
  tickLine: false,
  axisLine: false,
} as const

/** Spread onto a Recharts `CartesianGrid`: faint horizontal dashed lines only. */
export const gridProps = {
  stroke: colors.chartGrid,
  strokeDasharray: '4 4',
  vertical: false,
} as const

export const chartMargin = { top: 8, right: 8, left: 0, bottom: 0 } as const

/** Spread onto the `XAxis` of a daily chart. `openDay` names the last row
 * where it is a day still open, so its tick reads as that, not as a date. */
export function dayAxis(rows: { date: string }[], openDay?: string) {
  const last = rows[rows.length - 1]?.date
  return {
    dataKey: 'date',
    ...axisProps,
    minTickGap: 20,
    interval: 'preserveStartEnd',
    tickFormatter: (date: string) => (openDay && date === last ? openDay : fmtDateShort(date)),
  } as const
}

/** Spread onto a Recharts `Legend`: above the plot, drawn by `ChartLegend`. */
export const legendProps = {
  verticalAlign: 'top',
  content: ChartLegend,
} as const

/** Spread onto a Recharts `Line`. */
export const lineProps = {
  type: 'monotone',
  strokeWidth: 2,
  dot: false,
  activeDot: { r: 4, strokeWidth: 2, stroke: colors.card },
  isAnimationActive: false,
} as const

/** Arch Lend's two rates, wherever they are drawn together. Borrow takes the
 * product's color. Supply is neutral and dashed, so the pair does not rest on
 * color alone. */
export const rateLines = {
  borrow: { stroke: productColors.lend },
  supply: { stroke: colors.ink2, strokeDasharray: '5 4' },
} as const
