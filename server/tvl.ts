import type { AnalyticsData } from './analytics.js'
import { levelByDay, sum } from './series.js'

// Locked value as analytics' protocol chart serves it: three components that
// add to the total with no asset counted twice, each bucket its closing state.

const DAY_MS = 86_400_000

/** The components analytics counts as locked value (its `tvl` metric). */
export const TVL_COLUMNS = ['swap_liquidity_usd', 'lend_available_usd', 'vault_assets_usd'] as const

/** Locked value by product for each day of an axis. The last day is still
 * open, so its reading is the present one. */
export interface TvlReadings {
  swap: number[]
  lend: number[]
  vault: number[]
  change24hPct: number | null
}

export function protocolTvl(a: AnalyticsData, axis: string[]): TvlReadings {
  const [swap, lend, vault] = TVL_COLUMNS.map((column) => levelByDay(a.tvlDaily, column, axis))
  return { swap, lend, vault, change24hPct: change24hPct(hourlyTotals(a)) }
}

/** The chart's total at each hour of the hourly window, each component held
 * forward over a missing reading. */
function hourlyTotals(a: AnalyticsData): { t: number; usd: number }[] {
  const held = [0, 0, 0]
  return a.tvlHourly.map((row) => {
    TVL_COLUMNS.forEach((column, i) => {
      const v = row[column]
      if (v != null) held[i] = Number(v)
    })
    return { t: Date.parse(row.t), usd: sum(held) }
  })
}

/** Change over 24 hours between two hourly readings built the same way. */
export function change24hPct(readings: { t: number; usd: number }[]): number | null {
  const last = readings.at(-1)
  const dayAgo = last && readings.findLast((p) => p.t <= last.t - DAY_MS)
  return last && dayAgo && dayAgo.usd > 0 ? ((last.usd - dayAgo.usd) / dayAgo.usd) * 100 : null
}
