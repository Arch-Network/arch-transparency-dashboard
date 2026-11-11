// The loan book as analytics serves it (`/v1/lending/positions`): every
// lending account carrying debt now. Only the fields the aggregates read;
// addresses stay on the server.

/** One side of a balance. `amount_usd` is at analytics' reference price and
 * null without one. `weight_maint` is the maintenance weight the program
 * applies to it in this account, e-mode included; null until the bank is
 * sampled. */
export interface RawBalanceSide {
  /** Whole units of the market's token. */
  amount: string
  amount_usd: number | null
  weight_maint: number | null
}

/** An account's position in one market. `side` says which of the two sides
 * the position is, and so which one counts toward its health. */
export interface RawBalance {
  mint: string
  side: 'asset' | 'liability'
  asset: RawBalanceSide
  liability: RawBalanceSide
}

export interface RawAccount {
  authority: string
  borrowed_usd: number | null
  /** Null when a balance has no reference price or its bank's weights are unsampled. */
  health: { maintenance: { ok: boolean; health_factor: number | null } } | null
  /** Absent on an analytics build that does not serve them. */
  balances?: RawBalance[]
}

export interface RawLoanBook {
  accounts: RawAccount[]
}
