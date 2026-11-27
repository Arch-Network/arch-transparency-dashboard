import type { CSSProperties } from 'react'
import ChartLegend from '../components/ChartLegend'
import { colors, productColors } from '../theme'
import { fmtDateShort } from './format'

// Chart styling combining 9031wyb82's clean horizontal rhythm with Arch Prime's
// frosted dark tooltips, tabular ticks, and crisp geometry.

export const tooltipStyle: CSSProperties = {
  background: colors.tooltipBg,
  border: 'none',
  borderRadius: 10,
  padding: '9px 11px',
  fontSize: 12,
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
    fontSize: 11.5,
    fontWeight: 500,
    marginBottom: 5,
    paddingBottom: 5,
    borderBottom: `1px solid ${colors.tooltipRule}`,
  },
  itemStyle: {
    color: colors.tooltipFg,
    fontSize: 12,
    fontWeight: 500,
    padding: '1.5px 0',
  },
  cursor: {
    stroke: colors.chartCrosshair,
    strokeDasharray: '3 3',
    fill: colors.soft,
  },
} as const

export const axisTick = {
  fontSize: 11,
  fontWeight: 400,
  fontFamily: 'var(--ap-font-num)',
  fill: colors.ink3,
} as const

/** Spread onto every `XAxis` and `YAxis`: clean ticks with no axis spine or tick marks. */
export const axisProps = {
  tick: axisTick,
  tickLine: false,
  axisLine: false,
} as const

/** Spread onto a Recharts `CartesianGrid`: faint horizontal lines only. */
export const gridProps = {
  stroke: colors.chartGrid,
  vertical: false,
} as const

export const chartMargin = { top: 6, right: 8, left: 0, bottom: 0 } as const

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

/** Spread onto a Recharts `Legend`: bottom-centered, crisp and unobtrusive (like 9031wyb82). */
export const legendProps = {
  verticalAlign: 'bottom',
  content: ChartLegend,
} as const

/** Spread onto a Recharts `Line`. */
export const lineProps = {
  type: 'monotone',
  strokeWidth: 2,
  dot: false,
  activeDot: { r: 3.5, strokeWidth: 2, stroke: colors.card },
  isAnimationActive: false,
} as const

/** Arch Lend's two rates, wherever they are drawn together. */
export const rateLines = {
  borrow: { stroke: productColors.lend },
  supply: { stroke: productColors.vaults, strokeDasharray: '5 4' },
} as const
