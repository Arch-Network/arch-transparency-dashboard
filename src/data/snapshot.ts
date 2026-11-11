// The live data contract: one JSON document assembled server-side by
// `server/buildSnapshot.ts` from the Arch Prime Analytics API and the Arch
// Explorer API, served at `/api/snapshot`, and read by every live tab.
//
// Every field here has a real upstream source. Modules whose data has no
// source yet (the budget machine, reserve NAV) are not in this contract;
// their mock-era shapes remain in `src/types.ts`.
//
// The analytics API only adds over time, and a deployment can run a build
// older than this dashboard. A figure such a build does not serve is null
// here, and a figure it computes differently carries its method, so the page
// can label what it shows.
//
// Conventions: USD and token amounts are numbers in whole units. `_pct` fields
// are percentages (12.5 means 12.5%). Daily series use UTC dates `YYYY-MM-DD`,
// oldest first, with no gaps.

export type Network = 'mainnet' | 'testnet'

export interface SnapshotMeta {
  /** When this snapshot was assembled (ISO 8601, UTC). */
  as_of: string
  refresh_seconds: number
  network: Network
  /** Analytics build and the revision of its published numbers. */
  analytics_version: string
  data_revision: number
  /** Upstream sections that failed and were left out of this snapshot. */
  degraded: string[]
  /** When the slowest analytics decoder last completed an ingest pass. */
  analytics_synced_at: string | null
  /** True while analytics is rebuilding part of its history. */
  analytics_replaying: boolean
  /** Time of the newest block the explorer has indexed. */
  explorer_indexed_at: string | null
}

/** Chain activity, from the Arch Explorer API. */
export interface Chain {
  arch_block: number
  /** Current Bitcoin chain tip. Not a settlement anchor. */
  btc_tip_block: number | null
  tx_24h: number
  tx_total: number
  /** Transactions in the last 24 hours, per second. */
  tps_24h: number
  tps_peak: number
  /** 24 hours divided by the blocks produced in them. */
  avg_block_time_ms: number | null
  validators_active: number
  accounts_total: number
}

/** A market whose un-borrowed deposits are not in TVL. */
export interface TvlLeftOut {
  symbol: string
  /** At the Arch Lend oracle price; null when the oracle has no recent reading. */
  available_usd: number | null
}

export interface Overview {
  /** Pool reserves + un-borrowed lending liquidity + vault assets, each asset
   * once: vault shares supplied to Arch Lend count in the vault's assets only. */
  tvl_usd: number
  tvl_change_24h_pct: number | null
  /** `protocol`: the components as analytics' protocol chart serves them.
   * `rebuilt`: an older analytics build counts vault-share banks in its
   * lending component, so that component is rebuilt here bank by bank. */
  tvl_method: 'protocol' | 'rebuilt'
  /** Markets analytics has no reference price for. Under `protocol` they are
   * not in TVL; under `rebuilt` they are, at the oracle price, and this is empty. */
  tvl_left_out: TvlLeftOut[]
  /** Pool swaps plus PropAMM fills; pool swaps alone where the fills are null. */
  volume_cum_usd: number
  volume_24h_usd: number
  pool_volume_cum_usd: number
  pool_volume_24h_usd: number
  /** Null where this analytics build does not serve PropAMM fills. */
  propamm_volume_cum_usd: number | null
  propamm_volume_24h_usd: number | null
  /** Gross swap fees: the LP share and the protocol share together. */
  swap_fees_cum_usd: number
  swap_fees_30d_usd: number
  swap_fees_24h_usd: number
  /** Interest to Arch Lend suppliers. `credited`: what the banks added to
   * supplier balances, dated by the operation that booked it, through now.
   * `estimated`: each closed day's closing supply at its closing rate. */
  lender_interest_method: 'credited' | 'estimated'
  lender_interest_cum_usd: number
  lender_interest_7d_usd: number
}

/** Under `tvl_method: 'protocol'` each value is the day's close. Under
 * `rebuilt`, swap and vault values are the day's close and lending liquidity
 * is the day's time-weighted average. The last row is the present reading. */
export interface TvlDaily {
  date: string
  swap_usd: number
  lend_usd: number
  vault_usd: number
}

export interface VolumeDaily {
  date: string
  pool_usd: number
  /** Null on every row where this analytics build does not serve PropAMM fills. */
  propamm_usd: number | null
  /** Running total of both; of pool swaps alone where the fills are null. */
  cumulative_usd: number
}

export interface FeesDaily {
  date: string
  swap_fees_usd: number
}

export interface InterestDaily {
  date: string
  interest_usd: number
  cumulative_usd: number
}

export interface TxDaily {
  date: string
  tx_count: number
}

export interface Series {
  tvl_daily: TvlDaily[]
  volume_daily: VolumeDaily[]
  fees_daily: FeesDaily[]
  interest_daily: InterestDaily[]
  /** Null when the explorer section is degraded. */
  tx_daily: TxDaily[] | null
}

/** Each day's time-weighted average. */
export interface RatesDaily {
  date: string
  /** Null on a day the market held no deposits: there is no utilization to average. */
  utilization_pct: number | null
  borrow_apr_pct: number
  supply_apr_pct: number
}

export interface CurvePoint {
  utilization_pct: number
  borrow_apr_pct: number
  supply_apr_pct: number
}

/** The price a market's balances are valued at. */
export interface MarketPrice {
  usd: number
  /** `fixed`: a constant. `coinbase`: the running close of the current hour's
   * Coinbase candle. `vault`: the vault's net asset value per share. `pool`:
   * derived from an Arch Swap pool. `reference`: another analytics feed.
   * `oracle`: the bank's own oracle, averaged over the current hour, used
   * where analytics has no reference price. */
  source: 'fixed' | 'coinbase' | 'vault' | 'pool' | 'reference' | 'oracle'
  /** The open of the hour the price belongs to; null for a fixed price. */
  as_of: string | null
}

/** One Arch Lend bank: a group's pool for one mint. */
export interface Market {
  address: string
  mint: string
  symbol: string
  /** The mint is a vault's share token: a claim on assets the vault holds. */
  vault_shares: boolean
  /** Whole units of the mint. */
  supplied: number
  borrowed: number
  /** Null when neither analytics nor the bank's oracle prices the mint. */
  price: MarketPrice | null
  /** Null when `price` is. */
  supplied_usd: number | null
  borrowed_usd: number | null
  available_usd: number | null
  utilization_pct: number
  supply_apr_pct: number
  borrow_apr_pct: number
  /** The program's risk weights, as fractions. */
  asset_weight_init: number
  asset_weight_maint: number
  liability_weight_init: number
  liability_weight_maint: number
  optimal_utilization_pct: number
  plateau_rate_pct: number
  max_rate_pct: number
  liquidation_fee_pct: number
  operational_state: string
  risk_tier: string
  oracle: string
  borrowable: boolean
  /** Present for banks with debt outstanding. */
  rates_daily: RatesDaily[]
  curve: CurvePoint[]
}

/** A collateral market the program weighs above its base weights (e-mode) in
 * an account whose every debt is in a market that grants it. Where several
 * such markets are owed, the lowest of their weights applies. */
export interface EmodePairing {
  /** Market symbols. */
  collateral: string
  debt: string
  asset_weight_init: number
  asset_weight_maint: number
  /** The weights over the debt market's liability weights. */
  max_ltv_pct: number
  liquidation_ltv_pct: number
}

export type HealthBandId = 'liquidatable' | 'under_10' | 'from_10_to_25' | 'from_25_to_50' | 'over_50' | 'unrated'

/** Accounts in one band of liquidation buffer: how far the value of an
 * account's collateral can fall, its debt unchanged, before it can be
 * liquidated. `unrated`: no buffer could be computed, a balance having no
 * reference price. */
export interface HealthBand {
  id: HealthBandId
  accounts: number
  /** Debt without a reference price is not counted. */
  borrowed_usd: number
}

/** The lending accounts carrying debt now, in aggregate. */
export interface LoanBook {
  accounts: number
  /** Distinct owners of those accounts. */
  wallets: number
  /** Every band, riskiest first, `unrated` last. */
  health_bands: HealthBand[]
  /** The smallest buffer among the rated accounts. */
  lowest_buffer_pct: number | null
}

export interface Lend {
  /** Sums over the banks with a price. */
  supplied_usd: number
  borrowed_usd: number
  available_usd: number
  utilization_pct: number
  /** Null where this analytics build does not serve the loan book. */
  loan_book: LoanBook | null
  /** Null where this analytics build does not serve e-mode settings. */
  emode_pairings: EmodePairing[] | null
  /** Lifetime activity. `borrowers` counts lending accounts, not wallets. */
  borrow_events: number
  borrowers: number
  borrow_volume_usd: number
  liquidation_events: number
  liquidation_seized_usd: number
  liquidation_repaid_usd: number
  bankruptcy_events: number
  bad_debt_usd: number
  markets: Market[]
}

export interface Pool {
  address: string
  pair: string
  tvl_usd: number
  volume_24h_usd: number
  fees_24h_usd: number
}

export interface TransfersDaily {
  date: string
  transfers: number
  volume: number
}

/** aUSD ("Arch USD") and aBTC, from the Arch Explorer API. */
export interface Tokens {
  abtc_mint: string
  ausd_mint: string
  abtc_supply: number
  abtc_holders: number
  ausd_supply: number
  ausd_holders: number
  ausd_transfers_total: number
  ausd_transfer_volume_total: number
  ausd_transfers_daily: TransfersDaily[]
}

export interface Snapshot {
  meta: SnapshotMeta
  overview: Overview
  series: Series
  lend: Lend
  pools: Pool[]
  /** Null when the explorer section is degraded. */
  chain: Chain | null
  tokens: Tokens | null
}
