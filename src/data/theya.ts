// Theya Bitcoin custody/roster data, read from Arch Prime Analytics'
// `GET /v1/prime-transparency` endpoint (`T01`, `T02`, `O01`, `O02`,
// `shared:btc_price`, `shared:total_assets_24h_baseline`, and the `theya`
// ingestion job).

export type TheyaStatus = 'available' | 'stale' | 'incomplete' | 'unavailable'

export type TheyaJobStatus = 'success' | 'failed'

export interface TheyaCompositionPart {
  key: 'theya' | 'ausd' | 'abtc' | 'other'
  label: string
  /** USD value of this component, or null when unread/pending. */
  usd: number | null
  /** Native BTC amount for BTC-denominated parts (`theya` and `abtc`). */
  btc: number | null
}

/** Confirmed Bitcoin held across the tracked Theya mainnet address roster,
 * alongside the combined Arch asset total (`O01`) it enters. */
export interface TheyaData {
  /** Publication status of `T01` (confirmed Theya BTC). */
  status: TheyaStatus
  /** Confirmed BTC held across the tracked Theya roster (`T01`). Null when
   * unavailable or when a stale zero indicates an unread roster. */
  btc: number | null
  /** Exact decimal string published in `T01`, preserved without display rounding. */
  btc_raw: string | null
  /** USD value of confirmed Theya BTC (`T02 = T01 × BTC price`). */
  usd: number | null
  /** Reference BTC price used to value Theya BTC (`shared:btc_price`). */
  btc_price_usd: number | null
  btc_price_as_of: string | null
  /** Combined assets on Arch (`O01`: aUSD + aBTC + Theya BTC + aETH + aHYPE). */
  total_assets_usd: number | null
  /** 24-hour percentage change in combined assets (`O02`). */
  total_assets_change_24h_pct: number | null
  /** True when the 24-hour baseline carried an older Theya scan. */
  total_assets_change_24h_estimated: boolean
  /** Components of `total_assets_usd` (Theya BTC, aUSD, aBTC, other bridged assets). */
  composition: TheyaCompositionPart[]
  /** Confirmed Theya BTC 24 hours earlier, from `shared:total_assets_24h_baseline`. */
  btc_24h_ago: number | null
  /** Net change in confirmed Theya BTC over 24 hours (`btc - btc_24h_ago`). */
  btc_change_24h: number | null
  /** When the newest complete roster scan began (`T01.as_of`). */
  scan_started_at: string | null
  /** When the newest complete roster scan finished. */
  scan_completed_at: string | null
  /** Number of mainnet Bitcoin addresses in the scanned roster (e.g. 3,614). */
  address_count: number | null
  /** Bitcoin tip height when the scan started and ended. */
  btc_tip_start: number | null
  btc_tip_end: number | null
  /** Unconfirmed UTXOs observed during the scan (counted in no balance). */
  unconfirmed_outputs: number | null
  /** Latest `theya` ingestion job status, if published. */
  job_status: TheyaJobStatus | null
  /** Error message reported by the latest failed scan attempt, if any. */
  job_error: string | null
  /** When `/v1/prime-transparency` computed this publication. */
  computed_at: string | null
  /** Upstream source notes attached to `T01`. */
  notes: string[]
  /** Public endpoint URL these figures were read from (never includes tokens). */
  source_url: string
}
