import type { SnapshotMeta } from '../data/snapshot'

// Where a reader can check a figure. Links leave the page for three places
// only: the analytics API's cached global routes, the Arch Explorer's pages,
// and this dashboard's own snapshot. Per-address analytics routes are never
// linked: they are uncached and share a small query gate with the Arch Prime
// apps.

/** This dashboard's whole data document. */
export const SNAPSHOT_URL = '/api/snapshot'

type ProtocolMetric = 'tvl' | 'volume' | 'revenue' | 'yield'
type BankMetric = 'utilization' | 'borrow_apr' | 'supply_apr'

/** Links to the analytics API, at the addresses this snapshot was read from
 * where the route takes a window, so a link opens the same cached response. */
export function analyticsLinks(meta: SnapshotMeta) {
  const base = meta.analytics_api_url
  const from = encodeURIComponent(meta.history_start)
  return {
    protocolDaily: (metric: ProtocolMetric) => `${base}/v1/protocol/chart?metric=${metric}&interval=1d&from=${from}`,
    markets: `${base}/v1/markets`,
    pools: `${base}/v1/pools`,
    vaults: `${base}/v1/vaults`,
    loanBook: `${base}/v1/lending/positions`,
    lendingTotals: `${base}/v1/protocol/lending`,
    bankDaily: (bank: string, metric: BankMetric) =>
      `${base}/v1/markets/${bank}/chart?metric=${metric}&interval=1d&from=${from}`,
    bankCurve: (bank: string) => `${base}/v1/markets/${bank}/curve`,
    /** The bank's own oracle, hourly. */
    bankOracle: (bank: string) => `${base}/v1/markets/${bank}/chart?metric=price&interval=1h`,
  }
}

type ExplorerPage = 'accounts' | 'tokens' | 'programs'

/** An Arch Explorer page for an address (hex), or null where the explorer's
 * pages are not linked on this network. */
export function explorerLink(meta: SnapshotMeta, page: ExplorerPage, address: string): string | null {
  return meta.explorer_url && `${meta.explorer_url}/${page}/${address}`
}
