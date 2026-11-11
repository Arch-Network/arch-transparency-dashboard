import type { Config } from './config.js'
import { orNullIfNotServed, type GetJson } from './http.js'
import { fetchLegacyTvl, type LegacyTvlData } from './legacyTvl.js'

// The Arch Prime Analytics routes this dashboard reads, in the shapes
// `docs/API.md` of arch-prime-analytics documents. Amounts and USD values
// arrive as decimal strings; rates and weights as numbers.

/** The `data_revision` from which the protocol chart's `lend_available_usd`
 * leaves the vault-share banks out, so its TVL columns add with no asset
 * counted twice. Below it the lending component is rebuilt bank by bank
 * (`legacyTvl.ts`). */
export const TVL_COUNTS_ONCE_REVISION = 17

/** The `data_revision` from which `lend_supplier_interest_usd` is the interest
 * the banks credited. Below it the column is an estimate from each bucket's
 * closing supply and rate. */
export const INTEREST_AS_CREDITED_REVISION = 19

export interface RawVersion {
  version: string
  commit: string
  data_revision: number
}

export interface RawPool {
  address: string
  mint_a: string
  mint_b: string
  tvl_usd: string | null
  volume_24h_usd: string | null
  fees_24h_usd: string | null
}

export interface RawMarket {
  address: string
  mint: string
  config: {
    asset_weight_init: number
    asset_weight_maint: number
    liability_weight_init: number
    liability_weight_maint: number
    borrow_limit: string | null
    liquidation_fee: number
    operational_state: string
    risk_tier: string
    oracle: { setup: string }
    /** The bank's e-mode settings: its `tag` as collateral (0 for none) and
     * the collateral tags it weighs higher as the bank borrowed. Absent on an
     * analytics build that does not serve them; null until the bank is sampled. */
    emode?: {
      tag: number
      entries: { collateral_tag: number; asset_weight_init: number; asset_weight_maint: number }[]
    } | null
    interest_rate: {
      optimal_utilization_rate: number
      plateau_interest_rate: number
      max_interest_rate: number
    }
  }
  state: {
    total_assets_usd: string | null
    total_liabilities_usd: string | null
    available_usd: string | null
    /** Whole units of the bank's mint. */
    total_assets: string
    total_liabilities: string
    available: string
    utilization: number
    lending_rate_apr: number
    borrowing_rate_apr: number
    /** The reference price analytics values the mint at. `source` is `const`,
     * `coinbase`, `vault:<address>` or `pool:<address>`; `as_of` is the open
     * of the hourly candle, null for a constant. All null without a feed. */
    price: { usd: string | null; source: string | null; as_of: string | null }
  }
}

export interface RawVault {
  share_mint: string
  tvl_usd: string | null
}

export interface RawSyncStatus {
  /** One per decoder; `updated_at` moves on every completed ingest pass. */
  checkpoints: { name: string; updated_at: string }[]
  /** History replays not yet finished: figures they cover are incomplete. */
  replays: unknown[]
}

export interface RawProtocolLending {
  borrow_events: number
  borrowers: number
  borrow_volume_usd: string | null
  liquidation_events: number
  liquidation_seized_usd: string | null
  liquidation_repaid_usd: string | null
  bankruptcy_events: number
  bad_debt_usd: string | null
}

/** The loan book: every lending account carrying debt now. Only the fields
 * the aggregate reads; addresses stay on the server. */
export interface RawLoanBook {
  accounts: {
    authority: string
    borrowed_usd: number | null
    /** Null when a balance has no reference price or its bank's weights are unsampled. */
    health: { maintenance: { ok: boolean; health_factor: number | null } } | null
  }[]
}

/** A chart row: `t` plus one decimal-string column per stream. Protocol
 * charts name their columns and serve each bucket's closing state; a bank
 * chart serves `v`, the bucket's time-weighted average. */
export type ChartRow = { t: string } & Record<string, string | null>

export interface RawCurvePoint {
  utilization: number
  supply_apr: number
  borrow_apr: number
}

export interface BankSeries {
  utilization: ChartRow[]
  borrowApr: ChartRow[]
  supplyApr: ChartRow[]
  curve: RawCurvePoint[]
}

export interface AnalyticsData {
  version: RawVersion
  sync: RawSyncStatus
  pools: RawPool[]
  markets: RawMarket[]
  vaults: RawVault[]
  lending: RawProtocolLending
  /** Null where this analytics build does not serve the route. */
  loanBook: RawLoanBook | null
  tvlDaily: ChartRow[]
  tvlHourly: ChartRow[]
  /** `volume_usd` is pool swaps. `propamm_volume_usd` is PropAMM fills, a
   * column an older analytics build does not serve. */
  volumeDaily: ChartRow[]
  /** Hourly buckets holding exactly the trades of the last 24 hours. */
  volumeLastDay: ChartRow[]
  feesDaily: ChartRow[]
  interestDaily: ChartRow[]
  /** Keyed by bank address; only banks with debt outstanding. */
  bankSeries: Record<string, BankSeries>
  /** Keyed by bank address; the banks analytics has no reference price for.
   * The bank's own oracle price, hourly, over the hourly TVL window. */
  oracleHourly: Record<string, ChartRow[]>
  /** Set below `TVL_COUNTS_ONCE_REVISION` only. */
  legacyTvl: LegacyTvlData | null
}

export type BankChart = (bank: string, metric: string, interval: '1d' | '1h') => Promise<ChartRow[]>

const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

export async function fetchAnalytics(get: GetJson, cfg: Config, now: Date): Promise<AnalyticsData> {
  // A constant `from` keeps each daily URL identical between snapshots, so it
  // hits the analytics response cache. The hourly TVL window is aligned to
  // the hour for the same reason.
  const daily = (metric: string) =>
    get<{ points: ChartRow[] }>(
      `/v1/protocol/chart?metric=${metric}&interval=1d&from=${encodeURIComponent(cfg.historyStart)}`,
    ).then((r) => r.points)
  const hourly = (metric: string, from: string) =>
    get<{ points: ChartRow[] }>(
      `/v1/protocol/chart?metric=${metric}&interval=1h&from=${encodeURIComponent(from)}`,
    ).then((r) => r.points)
  const hourlyFrom = new Date(Math.floor(now.getTime() / HOUR_MS) * HOUR_MS - 25 * HOUR_MS).toISOString()
  // A flow chart sums the events from `from` on, so a window opening exactly
  // 24 hours ago holds the last 24 hours and nothing older. The URL is new on
  // every snapshot: one uncached query a minute.
  const dayAgo = new Date(now.getTime() - DAY_MS).toISOString()

  const [
    version,
    sync,
    pools,
    markets,
    vaults,
    lending,
    loanBook,
    tvlDaily,
    tvlHourly,
    volumeDaily,
    volumeLastDay,
    feesDaily,
    interestDaily,
  ] = await Promise.all([
    get<RawVersion>('/v1/version'),
    get<RawSyncStatus>('/v1/sync-status'),
    get<{ pools: RawPool[] }>('/v1/pools').then((r) => r.pools),
    get<{ markets: RawMarket[] }>('/v1/markets').then((r) => r.markets),
    get<{ vaults: RawVault[] }>('/v1/vaults').then((r) => r.vaults),
    get<RawProtocolLending>('/v1/protocol/lending'),
    orNullIfNotServed(get<RawLoanBook>('/v1/lending/positions')),
    daily('tvl'),
    hourly('tvl', hourlyFrom),
    daily('volume'),
    hourly('volume', dayAgo),
    daily('revenue'),
    daily('yield'),
  ])

  const bankChart: BankChart = (bank, metric, interval) =>
    get<{ points: ChartRow[] }>(
      `/v1/markets/${bank}/chart?metric=${metric}&interval=${interval}&from=${encodeURIComponent(
        interval === '1d' ? cfg.historyStart : hourlyFrom,
      )}`,
    ).then((r) => r.points)

  const shareMints = new Set(vaults.map((v) => v.share_mint))
  const holding = markets.filter((m) => Number(m.state.total_assets) > 0)
  const indebted = markets.filter((m) => Number(m.state.total_liabilities) > 0)
  const unpriced = holding.filter((m) => m.state.price.usd === null)

  const [series, oracle, legacyTvl] = await Promise.all([
    Promise.all(indebted.map((m) => fetchBankSeries(get, bankChart, m.address))),
    Promise.all(unpriced.map((m) => bankChart(m.address, 'price', '1h'))),
    version.data_revision < TVL_COUNTS_ONCE_REVISION ? fetchLegacyTvl(bankChart, holding, shareMints) : null,
  ])

  return {
    version,
    sync,
    pools,
    markets,
    vaults,
    lending,
    loanBook,
    tvlDaily,
    tvlHourly,
    volumeDaily,
    volumeLastDay,
    feesDaily,
    interestDaily,
    bankSeries: Object.fromEntries(indebted.map((m, i) => [m.address, series[i]])),
    oracleHourly: Object.fromEntries(unpriced.map((m, i) => [m.address, oracle[i]])),
    legacyTvl,
  }
}

async function fetchBankSeries(get: GetJson, chart: BankChart, bank: string): Promise<BankSeries> {
  const [utilization, borrowApr, supplyApr, curve] = await Promise.all([
    chart(bank, 'utilization', '1d'),
    chart(bank, 'borrow_apr', '1d'),
    chart(bank, 'supply_apr', '1d'),
    get<{ points: RawCurvePoint[] }>(`/v1/markets/${bank}/curve`).then((r) => r.points),
  ])
  return { utilization, borrowApr, supplyApr, curve }
}
