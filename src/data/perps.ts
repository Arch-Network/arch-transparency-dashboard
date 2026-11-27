// Perpetual futures (Arch Perps) snapshot contract.
//
// Populated server-side in `server/perps.ts` from the Arch Perps engine's
// public HTTP API (`/v1/info`, `/v1/stats`, `/v1/markets`, `/v1/funding`,
// `/health`) and the exchange's on-chain `Exchange` account read through Arch
// RPC. All USD amounts treat 1 aUSD as $1.00, matching the rest of this
// dashboard; `_pct` fields are percentages (12.5 means 12.5%), `_bps` are
// basis points (2 means 0.02%).

export type PerpsMarketClass = 'crypto' | 'tradfi'
export type PerpsUnderlying = 'coin' | 'stock' | 'commodity' | 'fund' | 'currency'

/** Scheduled or active share split of an underlying stock/ETF market. */
export interface PerpsSplit {
  close_at: string
  reopen_at: string
  shares_after: number
  shares_before: number
  closed: boolean
}

/** One perpetual market on Arch Perps. */
export interface PerpsMarket {
  id: number
  symbol: string
  base_symbol: string
  market_class: PerpsMarketClass | null
  underlying: PerpsUnderlying | null
  /** Index price in USD per unit of the underlying. */
  index_price_usd: number
  /** Mark price in USD per unit of the underlying. */
  mark_price_usd: number
  /** When the mark was last updated (ISO 8601, UTC). */
  mark_at: string
  /** 24-hour index price change in percent; null without a 24h open candle. */
  change_24h_pct: number | null
  high_24h_usd: number | null
  low_24h_usd: number | null
  /** Top-of-book maker bid and ask in USD per unit; null while not quoting. */
  bid_usd: number | null
  ask_usd: number | null
  /** Top-of-book spread in basis points; null while not quoting. */
  spread_bps: number | null
  /** Largest single-order size quoted by the maker per side, in USD at mark. */
  quoted_depth_usd: number | null
  /** Current funding rate longs pay shorts: %/hr, %/8h, and linear %/year. */
  funding_rate_hr_pct: number
  funding_rate_8h_pct: number
  funding_rate_apr_pct: number
  /** Taker open interest, in underlying units and USD at mark. */
  long_units: number
  short_units: number
  long_oi_usd: number
  short_oi_usd: number
  /** Gross taker open interest (long + short) in USD at mark. */
  open_interest_usd: number
  /** Long minus short open interest in USD at mark. */
  net_skew_usd: number
  /** Trailing 24-hour trading volume in USD; null until the engine has a full day. */
  volume_24h_usd: number | null
  initial_margin_pct: number
  maintenance_margin_pct: number
  max_leverage: number
  taker_fee_bps: number
  liquidation_fee_bps: number
  max_order_usd: number
  max_position_usd: number
  split: PerpsSplit | null
}

/** One 5-minute historical funding rate reading from `/v1/funding`. */
export interface PerpsFundingPoint {
  /** ISO 8601 UTC start of the 5-minute window. */
  time: string
  /** Hourly funding rate in percent (positive = longs pay shorts). */
  rate_hr_pct: number
  /** Linear annualized funding rate in percent (`rate_hr_pct * 8760`). */
  rate_apr_pct: number
}

/** Historical funding series for one tracked market. */
export interface PerpsFundingSeries {
  market_id: number
  symbol: string
  current_hr_pct: number
  current_apr_pct: number
  points: PerpsFundingPoint[]
}

/** On-chain state of the `Exchange` account read directly through Arch RPC. */
export interface PerpsOnChain {
  /** When the account was read (ISO 8601, UTC). */
  read_at: string
  /** Total collateral balance recorded across all perps accounts on chain (USD). */
  total_balance_usd: number
  /** Last settlement batch sequence applied on chain. */
  settle_seq: number
  /** Delay before an owner can execute a self-custody escape hatch withdrawal. */
  withdraw_delay_s: number
  paused: boolean
}

/** Complete perpetuals section of the dashboard snapshot. */
export interface PerpsSnapshot {
  /** When the perps engine was read (ISO 8601, UTC). */
  read_at: string
  network: string
  exchange: string
  program: string
  collateral_mint: string
  collateral_symbol: string
  collateral_decimals: number
  operator: string
  maker: string
  /** Engine build SHA from `/health`; null if `/health` did not answer. */
  build_sha: string | null
  /** Non-null when the engine is halted, naming the reason. */
  halted: string | null
  /** Engine settlement sequence number. */
  settle_seq: number
  /** Aggregate taker open interest (long + short) in USD at mark. */
  gross_open_interest_usd: number
  long_open_interest_usd: number
  short_open_interest_usd: number
  /** Maker's net directional exposure across markets in USD at mark. */
  net_notional_usd: number
  /** Maker's total equity (collateral + unrealized PnL) in USD. */
  maker_equity_usd: number
  /** Margin the maker must hold (net + gross rate) in USD. */
  maker_requirement_usd: number
  /** Taker initial margin on gross open interest, without netting, in USD. */
  unnetted_requirement_usd: number
  /** Insurance fund balance in USD. */
  insurance_fund_usd: number
  /** Cumulative taker fees collected by the exchange fee account in USD. */
  fees_collected_usd: number
  /** Trailing 24-hour trading volume across all markets; null if no market reports 24h volume yet. */
  volume_24h_usd: number | null
  /** Registered perps accounts known to the engine. */
  accounts: number
  /** Resting limit/stop orders currently open. */
  open_orders: number
  /** Market counts. */
  markets_total: number
  markets_priced: number
  markets_quoted: number
  markets_with_oi: number
  markets_with_volume_24h: number
  crypto_markets: number
  tradfi_markets: number
  /** Volume and OI broken down by asset class (crypto vs tradfi vs unclassified). */
  crypto_volume_24h_usd: number
  tradfi_volume_24h_usd: number
  crypto_oi_usd: number
  tradfi_oi_usd: number
  /** On-chain `Exchange` account state; null if RPC was unavailable or not configured. */
  on_chain: PerpsOnChain | null
  /** Every live market, active markets first, then by 24h volume and open interest. */
  markets: PerpsMarket[]
  /** 5-minute funding rate history for the top active / major markets. */
  funding_history: PerpsFundingSeries[]
}
