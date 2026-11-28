// Upstream HTTP: a JSON GET with a timeout, behind a per-upstream concurrency
// limit. The limit matters: the analytics API admits only a few concurrent
// queries (API_QUERY_CONCURRENCY, default 3) and answers 503 past that, and
// the Arch Prime apps share that gate.

const TIMEOUT_MS = 15_000
const MAX_429_RETRIES = 2
const MAX_RETRY_DELAY_MS = 5_000

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function retryDelayMs(res: Response, attempt: number): number {
  const header = Number(res.headers.get('retry-after'))
  if (Number.isFinite(header) && header > 0) return Math.min(header * 1000, MAX_RETRY_DELAY_MS)
  return 500 * 2 ** attempt
}

export type GetJson = <T>(path: string) => Promise<T>

/** An upstream answer other than 2xx. */
export class HttpError extends Error {
  constructor(
    url: string,
    readonly status: number,
  ) {
    super(`${url} answered ${status}`)
  }
}

/** For a route an older upstream build does not serve: its 404 reads as null. */
export const orNullIfNotServed = <T>(request: Promise<T>): Promise<T | null> =>
  request.catch((err: unknown) => {
    if (err instanceof HttpError && err.status === 404) return null
    throw err
  })

/** Runs at most `limit` tasks at once; the rest wait in order. A finishing
 * task hands its slot straight to the next waiter, so the count never
 * overshoots between a release and a wake-up. */
function limiter(limit: number) {
  let active = 0
  const waiting: (() => void)[] = []
  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= limit) await new Promise<void>((resolve) => waiting.push(resolve))
    else active++
    try {
      return await task()
    } finally {
      const next = waiting.shift()
      if (next) next()
      else active--
    }
  }
}

export function client(baseUrl: string, concurrency: number, headers: Record<string, string> = {}): GetJson {
  const run = limiter(concurrency)
  return <T>(path: string) =>
    run(async () => {
      for (let attempt = 0; ; attempt++) {
        const res = await fetch(baseUrl + path, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) })
        if (res.status === 429 && attempt < MAX_429_RETRIES) {
          await sleep(retryDelayMs(res, attempt))
          continue
        }
        if (!res.ok) throw new HttpError(baseUrl + path, res.status)
        return (await res.json()) as T
      }
    })
}
