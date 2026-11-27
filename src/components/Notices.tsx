import type { Snapshot } from '../data/snapshot'
import { fmtTs } from '../lib/format'
import { lagging } from '../lib/status'
import { Skeleton, StatStrip } from './ui'

/** Shown in place of the pages until a first snapshot arrives: Arch Prime shimmer skeleton while loading,
 * or a calm StateScreen-style card if fetching failed. */
export function Unavailable({ error }: { error: string | null }) {
  if (error) {
    return (
      <div className="card mx-auto mt-10 flex max-w-md flex-col items-center px-6 py-10 text-center">
        <span
          aria-hidden="true"
          className="mb-4 grid size-11 place-items-center rounded-[13px] bg-down-soft text-down"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4m0 4h.01" />
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          </svg>
        </span>
        <p className="font-heading text-[18px] font-medium tracking-[-0.015em] text-ink">
          Live data is unavailable right now
        </p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
          {error} Retrying automatically every minute.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4" role="status" aria-label="Loading live data">
      <div className="flex items-end justify-between gap-4 pb-1">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40 rounded-[10px]" />
          <Skeleton className="h-4 w-72 max-w-full rounded-[6px]" />
        </div>
        <Skeleton className="hidden h-9 w-48 rounded-pill sm:inline-block" />
      </div>

      <StatStrip>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2.5">
            <Skeleton className="h-3.5 w-24 rounded-[6px]" />
            <Skeleton className="h-8 w-32 rounded-[8px]" />
            <Skeleton className="h-3.5 w-40 max-w-full rounded-[6px]" />
          </div>
        ))}
      </StatStrip>

      <div className="card space-y-4 p-5 sm:p-6">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-44 rounded-[6px]" />
          <Skeleton className="h-3.5 w-80 max-w-full rounded-[6px]" />
        </div>
        <Skeleton className="h-[240px] w-full rounded-[14px] sm:h-[300px]" />
      </div>

      <div className="card space-y-3 p-5 sm:p-6">
        <Skeleton className="h-5 w-32 rounded-[6px]" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 border-t border-line pt-3">
            <Skeleton className="h-4 w-36 rounded-[6px]" />
            <Skeleton className="h-4 w-24 rounded-[6px]" />
            <Skeleton className="hidden h-4 w-24 rounded-[6px] sm:inline-block" />
          </div>
        ))}
      </div>
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
        <div key={n} className="note" role="status">
          <span
            aria-hidden="true"
            className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-[6px] bg-warn-soft text-warn"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 5.25v3.5M8 11.25h.01" />
              <circle cx="8" cy="8" r="6.5" />
            </svg>
          </span>
          <p className="min-w-0 flex-1 text-ink-2">{n}</p>
        </div>
      ))}
    </div>
  )
}
