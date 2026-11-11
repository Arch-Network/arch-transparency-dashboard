import type { Snapshot, SnapshotMeta } from '../data/snapshot'

// How current the snapshot on screen is, in one word, and which upstream is
// behind when one is.

export type Status = 'live' | 'delayed' | 'stale' | 'loading'

const LAG_LIMIT_MS = 10 * 60_000

/** Whether an upstream's data was more than ten minutes old when the snapshot was built. */
export function lagging(meta: SnapshotMeta, at: string | null): boolean {
  return at !== null && Date.parse(meta.as_of) - Date.parse(at) > LAG_LIMIT_MS
}

/** `stale`: the latest refresh failed. `delayed`: an upstream is behind the
 * chain, or the snapshot on screen is itself more than ten minutes old. */
export function statusOf(data: Snapshot | null, error: string | null, now: number): Status {
  if (error) return 'stale'
  if (!data) return 'loading'
  const { meta } = data
  const old = now - Date.parse(meta.as_of) > LAG_LIMIT_MS
  return old || lagging(meta, meta.analytics_synced_at) || lagging(meta, meta.explorer_indexed_at) ? 'delayed' : 'live'
}
