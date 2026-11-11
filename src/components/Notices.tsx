import type { Snapshot } from '../data/snapshot'
import { fmtTs } from '../lib/format'
import { lagging } from '../lib/status'

/** Shown in place of the pages until a first snapshot arrives. */
export function Unavailable({ error }: { error: string | null }) {
  return (
    <div
      className={
        'mx-auto mt-10 max-w-xl rounded-card border p-4 text-center text-[13px] ' +
        (error ? 'border-down-line bg-down-soft' : 'border-line bg-card')
      }
    >
      {error ? (
        <>
          <p className="font-medium">Live data is unavailable right now</p>
          <p className="mt-1">{error} Retrying every minute.</p>
        </>
      ) : (
        <p className="text-ink-2">Loading live data…</p>
      )}
    </div>
  )
}

/** What the reader should know about the snapshot on screen: stale, delayed or partial. */
export default function Notices({ data, error }: { data: Snapshot; error: string | null }) {
  const { meta } = data
  const notices = [
    ...(error ? [`The latest refresh failed, so these figures are as of ${fmtTs(meta.as_of)}. ${error}`] : []),
    ...(meta.analytics_synced_at && lagging(meta, meta.analytics_synced_at)
      ? [`Arch Prime Analytics last caught up with the chain at ${fmtTs(meta.analytics_synced_at)}, so protocol figures are as of then.`]
      : []),
    ...(meta.explorer_indexed_at && lagging(meta, meta.explorer_indexed_at)
      ? [`The Arch Explorer last indexed a block at ${fmtTs(meta.explorer_indexed_at)}, so chain and token figures are as of then.`]
      : []),
    ...(meta.analytics_replaying
      ? ['Arch Prime Analytics is rebuilding part of its history, so some figures may be incomplete until it finishes.']
      : []),
    ...(data.meta.degraded.includes('explorer')
      ? ['The Arch Explorer did not answer, so chain and token figures are left out until the next refresh.']
      : []),
    ...(data.meta.degraded.includes('bridges')
      ? ['The Arch RPC did not answer, so the aUSD and aBTC bridges’ current settings are left out until the next refresh.']
      : []),
  ]
  if (notices.length === 0) return null
  return (
    <div className="mb-4 space-y-2">
      {notices.map((n) => (
        <p key={n} className="note">
          {n}
        </p>
      ))}
    </div>
  )
}
