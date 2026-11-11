import type { GetJson } from './http.js'

// The Arch Explorer (indexer) routes this dashboard reads, per the OpenAPI
// specification at https://explorer.arch.network/docs. The explorer's CORS
// policy admits only its own origin, which is why these are fetched here and
// not from the browser.

export interface RawNetworkStats {
  total_transactions: number
  latest_block_height: number
  latest_indexed_block_timestamp: string
  peak_tps: number
  tx_24h: number
  total_accounts: number
}

export interface RawToken {
  symbol: string
  decimals: number
  /** Atoms, as a decimal string. */
  supply: string
  holders: number
}

export interface RawTokenAnalytics {
  total_transfers: number
  total_volume_ui: number
  /** The last 30 days, without the days that had no transfer. */
  daily: { day: string; transfers: number; volume_ui: number }[]
}

export interface ExplorerData {
  stats: RawNetworkStats
  blocks24h: number
  /** The last 30 days. */
  txVolume: { date: string; count: number }[]
  validatorsActive: number
  btcTip: number | null
  /** Keyed by mint (hex). */
  tokens: Record<string, RawToken>
  ausdAnalytics: RawTokenAnalytics
}

export async function fetchExplorer(get: GetJson, mints: string[], ausdMint: string): Promise<ExplorerData> {
  const [stats, historical, txVolume, validators, btcTip, tokenList, ausdAnalytics] = await Promise.all([
    get<RawNetworkStats>('/network/stats'),
    get<{ blocks_count: number }>('/network/stats/historical?timeframe=24h'),
    get<{ date: string; count: number }[]>('/network/transaction-volume'),
    // 200 is the route's largest page; a set past that would need paging.
    get<{ results: { status: string }[] }>('/validators?limit=200'),
    // Proxied from a Bitcoin indexer; its absence should not cost the section.
    get<{ height: number }>('/bitcoin/tip').then(
      (r) => r.height,
      () => null,
    ),
    Promise.all(mints.map((mint) => get<RawToken>(`/tokens/${mint}`))),
    get<RawTokenAnalytics>(`/tokens/${ausdMint}/analytics`),
  ])
  return {
    stats,
    blocks24h: historical.blocks_count,
    txVolume,
    validatorsActive: validators.results.filter((v) => v.status === 'active').length,
    btcTip,
    tokens: Object.fromEntries(mints.map((mint, i) => [mint, tokenList[i]])),
    ausdAnalytics,
  }
}
