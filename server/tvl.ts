import type { AnalyticsData } from './analytics.js'
import { dayApart, levelByDay, pctChange } from './series.js'

// Locked value as analytics' protocol chart serves it: three components that
// add to the total with no asset counted twice, each bucket its closing state.

/** The components analytics counts as locked value (its `tvl` metric). */
export const TVL_COLUMNS = ['swap_liquidity_usd', 'lend_available_usd', 'vault_assets_usd'] as const

/** Locked value by product at one hour. */
export interface HourlyTvl {
  t: number
  swap: number
  lend: number
  vault: number
}

/** Change over 24 hours between two hourly readings built the same way. */
export interface TvlChange {
  usd: number
  pct: number | null
  swapPct: number | null
  lendPct: number | null
  vaultPct: number | null
}

/** Locked value by product for each day of an axis. The last day is still
 * open, so its reading is the present one. */
export interface TvlReadings {
  swap: number[]
  lend: number[]
  vault: number[]
  /** Null without an hourly reading 24 hours back. */
  change24h: TvlChange | null
}

export function protocolTvl(a: AnalyticsData, axis: string[]): TvlReadings {
  const [swap, lend, vault] = TVL_COLUMNS.map((column) => levelByDay(a.tvlDaily, column, axis))
  return { swap, lend, vault, change24h: tvlChange(hourlyTvl(a)) }
}

/** The chart's components at each hour of the hourly window, each held
 * forward over a missing reading. */
export function hourlyTvl(a: AnalyticsData): HourlyTvl[] {
  const held = [0, 0, 0]
  return a.tvlHourly.map((row) => {
    TVL_COLUMNS.forEach((column, i) => {
      const v = row[column]
      if (v != null) held[i] = Number(v)
    })
    return { t: Date.parse(row.t), swap: held[0], lend: held[1], vault: held[2] }
  })
}

const total = (r: HourlyTvl): number => r.swap + r.lend + r.vault

export function tvlChange(readings: HourlyTvl[]): TvlChange | null {
  const pair = dayApart(readings)
  if (!pair) return null
  const { then, now } = pair
  return {
    usd: total(now) - total(then),
    pct: pctChange(total(then), total(now)),
    swapPct: pctChange(then.swap, now.swap),
    lendPct: pctChange(then.lend, now.lend),
    vaultPct: pctChange(then.vault, now.vault),
  }
}
