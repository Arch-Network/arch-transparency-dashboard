import { useEffect, useState } from 'react'
import type { Snapshot } from '../data/snapshot'

export interface SnapshotState {
  data: Snapshot | null
  /** Set when the latest fetch failed. `data` keeps the last good snapshot. */
  error: string | null
}

const RETRY_SECONDS = 60

/** Rejects with a sentence fit to show the reader. */
async function fetchSnapshot(): Promise<Snapshot> {
  const res = await fetch('/api/snapshot').catch(() => null)
  if (!res) throw new Error('The data service could not be reached.')
  if (!res.ok) throw new Error(`The data service answered with status ${res.status}.`)
  try {
    return (await res.json()) as Snapshot
  } catch {
    throw new Error('The data service sent an answer that could not be read.')
  }
}

/** Loads `/api/snapshot` and reloads it every `meta.refresh_seconds`. A failed
 * reload keeps the snapshot already on screen and reports the error beside it. */
export function useSnapshot(): SnapshotState {
  const [state, setState] = useState<SnapshotState>({ data: null, error: null })

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function load() {
      let nextInSeconds = RETRY_SECONDS
      try {
        const data = await fetchSnapshot()
        if (cancelled) return
        setState({ data, error: null })
        nextInSeconds = data.meta.refresh_seconds
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : String(err)
        setState((prev) => ({ data: prev.data, error: message }))
      }
      // Scheduled after each load settles, so a slow load never overlaps the next.
      timer = setTimeout(load, nextInSeconds * 1000)
    }

    load()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  return state
}
