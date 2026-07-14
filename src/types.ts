// TypeScript interfaces mirroring master spec §6 mock data schema.
// Field names are the contract with engineering — do not rename.
// Fields marked EXTENSION go beyond §6; each is required by a module in
// master §3 / §8.7 / §10 that §6 does not cover. See README "Schema extensions".

export interface Meta {
  as_of: string
  refresh_minutes: number
  /** EXTENSION — header "Arch block [N] · settled to Bitcoin block [M]" (build handoff §3). */
  arch_block: number
  /** EXTENSION — header Bitcoin settlement anchor block. */
  btc_anchor_block: number
  /** EXTENSION — single BTC/USD mark used for all BTC↔USD conversions in the mock. */
  btc_price_usd: number
}

export interface Overview {
  total_revenue_usd: number
  revenue_change_24h_pct: number
  tvl_usd: number
  tvl_change_24h_pct: number
  cumulative_volume_usd: number
  volume_24h_usd: number
  lp_yield_distributed_usd: number
  lp_yield_7d_usd: number
  btc_on_arch: number
  active_loans: number
  tx_24h: number
  avg_block_time_ms: number
  validators: number
}

export interface TvlDaily {
  date: string
  swap_usd: number
  lend_deposits_usd: number
  collateral_usd: number
}

export interface VolumeDaily {
  date: string
  volume_usd: number
  cumulative_usd: number
}

export interface RevenueDaily {
  date: string
  blockspace_usd: number
  swap_usd: number
  lend_spread_usd: number
  liquidation_usd: number
  partner_usd: number
  /** EXTENSION — asset-management fee revenue (HFT acquisition AM business; Matt, 2026-07-03). */
  am_usd: number
}

export interface LpYieldDaily {
  date: string
  distributed_usd: number
  cumulative_usd: number
  /** EXTENSION — LP yield split by source: Swap LP fees (§10 Distribution CORE). */
  swap_usd: number
  /** EXTENSION — LP yield split by source: Lend supply interest (§10 Distribution CORE). */
  lend_usd: number
}

export interface UtilizationDaily {
  date: string
  utilization_pct: number
  borrow_apr_pct: number
  supply_apy_pct: number
}

export interface BlockspaceDaily {
  date: string
  tx_count: number
  fees_btc: number
  avg_fee_sats: number
}

export interface AssetCategory {
  category: string
  deposited_usd: number
  borrowed_usd: number
}

export interface Series {
  tvl_daily: TvlDaily[]
  volume_daily: VolumeDaily[]
  revenue_daily: RevenueDaily[]
  lp_yield_daily: LpYieldDaily[]
  utilization_daily: UtilizationDaily[]
  blockspace_daily: BlockspaceDaily[]
  assets_by_category: AssetCategory[]
}

export interface RiskParams {
  max_ltv_pct: number
  lltv_pct: number
  liq_penalty_max_pct: number
  target_utilization_pct: number
}

export interface LtvBucket {
  bucket_min: number
  bucket_max: number
  loan_count: number
  debt_usd: number
}

export interface Loan {
  owner_trunc: string
  collateral_btc: number
  debt_usd: number
  ltv_pct: number
  dist_to_liq_pct: number
  liq_price_usd: number
}

export interface Liquidation {
  ts: string
  collateral_btc: number
  debt_repaid_usd: number
  penalty_usd: number
  recovery_pct: number
}

export interface Risk {
  total_collateral_btc: number
  total_collateral_usd: number
  total_borrowed_usd: number
  aggregate_ltv_pct: number
  utilization_pct: number
  available_liquidity_usd: number
  params: RiskParams
  ltv_distribution: LtvBucket[]
  loans: Loan[]
  liquidations: Liquidation[]
  /** EXTENSION — loans issued, cumulative USD (§10 Credit CORE; distinct from debt outstanding, §8.6). */
  loans_issued_cum_usd: number
  /** EXTENSION — loans issued, cumulative count (§10 Credit CORE). */
  loans_issued_count: number
  /** EXTENSION — bad debt outstanding (§8.7 Bad Debt card). */
  bad_debt_usd: number
  /** EXTENSION — insurance fund balance. [MOCK — mechanism pending confirmation] (§8.7 / Open Item 9). */
  insurance_fund_usd: number
}

export interface FlywheelFlows {
  deployed_usd: number
  activity_usd: number
  revenue_usd: number
  distributed_usd: number
  net_new_capital_usd: number
  deltas_pct: {
    deployed: number
    activity: number
    revenue: number
    distributed: number
    net_new_capital: number
  }
}

export interface FlywheelRatios {
  capital_productivity_pct: number
  utilization_pct: number
  recycle_rate_pct: number
  attraction_ratio: number
  positive_flow_weeks: number
}

export interface FlywheelRatiosDaily {
  date: string
  capital_productivity_pct: number
  recycle_rate_pct: number
  attraction_ratio: number
}

export interface Flywheel {
  window_days: number
  flows: FlywheelFlows
  ratios: FlywheelRatios
  ratios_daily: FlywheelRatiosDaily[]
}

export interface ReserveComposition {
  asset: string
  nav_usd: number
  share_pct: number
}

export interface ArchUsdFlowsDaily {
  date: string
  minted_usd: number
  redeemed_usd: number
  net_usd: number
  retention_pct: number
}

export interface ArchUsdNavDaily {
  date: string
  reserve_nav_usd: number
  supply_onchain_usd: number
}

export interface ArchUsdYieldDaily {
  date: string
  basis_apr_30d_pct: number
  redistributed_usd: number
}

export interface ArchUsd {
  /** EXTENSION — protocol-seeded float at genesis (the raise); user flows layer on top. */
  seed_float_usd: number
  supply_onchain_usd: number
  reserve_nav_usd: number
  backing_ratio_pct: number
  basis_yield_30d_pct: number
  retention_pct: number
  yield_redistributed_usd: number
  nav_last_attested: string
  reserve_composition: ReserveComposition[]
  flows_daily: ArchUsdFlowsDaily[]
  nav_daily: ArchUsdNavDaily[]
  yield_daily: ArchUsdYieldDaily[]
}

/** EXTENSION block — the budget machine (Arch Economic Model v0.3; Matt, 2026-07-03).
 * Income from two engines is allocated in priority order: rate wedge →
 * retention yield → buffer fill → surplus deployed into the ecosystem. */
export interface Budget {
  targets: {
    lender_apy_pct: number
    borrow_apr_pct: number
    retention_band_min_pct: number
    retention_band_max_pct: number
    buffer_target_months: number
  }
  income_30d: {
    float_usd: number
    onchain_usd: number
    total_usd: number
  }
  allocations_30d: {
    wedge_usd: number
    retention_yield_usd: number
    buffer_topup_usd: number
    surplus_deployed_usd: number
  }
  buffer: {
    balance_usd: number
    target_usd: number
    months_cover: number
  }
  surplus_deployed_cum_usd: number
  surplus_daily: { date: string; deployed_usd: number; cumulative_usd: number }[]
  funded_without_buffer_draw: boolean
}

/** EXTENSION block — §8.2 Liquidity module + §10 TVL CORE (pool depth per pair,
 * available stablecoin liquidity by asset). Not covered by §6. */
export interface Liquidity {
  swap_pools: { pair: string; depth_usd: number }[]
  lend_available: { asset: string; available_usd: number }[]
}

export interface MockData {
  meta: Meta
  overview: Overview
  series: Series
  risk: Risk
  flywheel: Flywheel
  archusd: ArchUsd
  liquidity: Liquidity
  budget: Budget
}
