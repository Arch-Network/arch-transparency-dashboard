import type { CSSProperties } from 'react'
import { colors } from '../theme'

// Chart treatment from the Arch o11y dashboard: dashed grid in the border
// color, small sans ticks, the legend above the plot, a flat raised tooltip
// with ink text, thin lines and no entrance animation.

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
  fontSize: 11,
  fill: colors.ink2,
} as const

/** Spread onto a Recharts `CartesianGrid`. */
export const gridProps = {
  stroke: colors.line,
  strokeDasharray: '3 3',
} as const

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

// Used by the dormant mock-era charts only.
export const legendStyle: CSSProperties = { fontSize: 11 }
