import type { CSSProperties } from 'react'
import { colors } from '../theme'
import { fmtDateShort } from './format'

// Chart treatment from the Arch o11y dashboard: dashed horizontal grid lines
// in the border color, small sans ticks, the legend above the plot, a flat
// raised tooltip with ink text, thin lines and no entrance animation.

export const tooltipStyle: CSSProperties = {
  background: colors.raised,
  border: `1px solid ${colors.line2}`,
  borderRadius: 8,
  fontSize: 12,
}

/** Spread onto a Recharts `Tooltip`. */
export const tooltipProps = {
  contentStyle: tooltipStyle,
  labelStyle: { color: colors.ink },
  itemStyle: { color: colors.ink },
  cursor: { fill: colors.soft },
} as const

export const axisTick = {
  fontSize: 12,
  fill: colors.ink2,
} as const

/** Spread onto a Recharts `CartesianGrid`. */
export const gridProps = {
  stroke: colors.line,
  strokeDasharray: '3 3',
  vertical: false,
} as const

export const chartMargin = { top: 4, right: 8, left: 0, bottom: 0 } as const

/** Spread onto the `XAxis` of a daily chart. `openDay` names the last row
 * where it is a day still open, so its tick reads as that, not as a date. */
export function dayAxis(rows: { date: string }[], openDay?: string) {
  const last = rows[rows.length - 1]?.date
  return {
    dataKey: 'date',
    tick: axisTick,
    minTickGap: 16,
    interval: 'preserveStartEnd',
    tickFormatter: (date: string) => (openDay && date === last ? openDay : fmtDateShort(date)),
  } as const
}

/** Spread onto a Recharts `Legend`. */
export const legendProps = {
  verticalAlign: 'top',
  iconSize: 10,
} as const

/** Spread onto a Recharts `Line`. */
export const lineProps = {
  strokeWidth: 1.5,
  dot: false,
  isAnimationActive: false,
} as const
