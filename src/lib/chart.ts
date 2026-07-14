import type { CSSProperties } from 'react'
import { colors } from '../theme'

export const tooltipStyle: CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  fontSize: 12,
  fontFamily: 'IBM Plex Mono, monospace',
}

export const axisTick = {
  fontSize: 10,
  fill: colors.inkMuted,
  fontFamily: 'IBM Plex Mono, monospace',
} as const

export const legendStyle: CSSProperties = { fontSize: 11 }
