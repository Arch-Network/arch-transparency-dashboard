import type { ChartRow } from './analytics.js'

// Turning the analytics chart rows into gap-free daily series. The API omits
// quiet buckets and serves nulls where a stream has no reading; its contract
// is that consumers zero-fill flows and forward-fill levels.

const DAY_MS = 86_400_000

export const num = (v: string | number | null | undefined): number => (v == null ? 0 : Number(v))
export const numOrNull = (v: string | number | null | undefined): number | null => (v == null ? null : Number(v))
export const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0)
export const dayOf = (iso: string): string => iso.slice(0, 10)

/** Every UTC date from `start` through `end`, inclusive. */
export function dayAxis(start: string, end: string): string[] {
  const out: string[] = []
  const last = Date.parse(end + 'T00:00:00Z')
  for (let t = Date.parse(start + 'T00:00:00Z'); t <= last; t += DAY_MS) {
    out.push(new Date(t).toISOString().slice(0, 10))
  }
  return out
}

function columnByDay(rows: ChartRow[], column: string): Map<string, number> {
  const byDay = new Map<string, number>()
  for (const row of rows) {
    const v = row[column]
    if (v != null) byDay.set(dayOf(row.t), Number(v))
  }
  return byDay
}

/** A flow per day of `axis`: a day with no bucket moved nothing. */
export function flowByDay(rows: ChartRow[], column: string, axis: string[]): number[] {
  const byDay = columnByDay(rows, column)
  return axis.map((d) => byDay.get(d) ?? 0)
}

/** A level per day of `axis`: a day with no reading holds the previous one. */
export function levelByDay(rows: ChartRow[], column: string, axis: string[]): number[] {
  const byDay = columnByDay(rows, column)
  let held = 0
  return axis.map((d) => (held = byDay.get(d) ?? held))
}

/** A reading per day of `axis`, null on a day with no bucket. For a series
 * the API leaves out where it is undefined, not where it is quiet: a day's
 * utilization is absent when the market held no deposits at any point in it,
 * which is neither the previous day's value nor zero. */
export function readingByDay(rows: ChartRow[], column: string, axis: string[]): (number | null)[] {
  const byDay = columnByDay(rows, column)
  return axis.map((d) => byDay.get(d) ?? null)
}

export function runningTotal(values: number[]): number[] {
  let total = 0
  return values.map((v) => (total += v))
}
