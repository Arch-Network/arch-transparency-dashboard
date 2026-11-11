import type { Stress } from '../src/data/snapshot.js'
import type { RawAccount, RawBalance } from './rawLoanBook.js'
import { sum } from './series.js'

// What a move in the BTC price would do to the loan book. Each account is
// taken whole, as the program judges it: every deposit at its maintenance
// weight against every debt at its own, the weights being the ones analytics
// reports as applied, e-mode included. E-mode depends on which markets an
// account owes, not on prices, so a move leaves the weights as they are.
//
// The book is otherwise held still: no repayment, no interest, no
// liquidation feeding the next. Values are at analytics' reference prices,
// not the program's oracle.

/** How a token's price follows BTC here: one for one, not at all, or no rule. */
export type PriceLink = 'btc' | 'usd' | null
export type LinkOf = (mint: string) => PriceLink

/** Moves in the BTC price, in percent. Both ways: aBTC is borrowed as well
 * as deposited, so a rise hurts the accounts that owe it. */
export const BTC_MOVES_PCT = [-50, -30, -20, -10, 0, 10, 20, 30]

interface Weighed {
  /** Maintenance-weighted USD that does not move, and that moves with BTC. */
  fixed: number
  btc: number
}

interface Rated {
  account: RawAccount
  assets: Weighed
  liabilities: Weighed
}

/** The side of a balance that counts toward the account's health. */
const counted = (b: RawBalance) => (b.side === 'liability' ? b.liability : b.asset)

/** The account's two sides, split by what moves. Null where the test cannot
 * rate it: the loan book gave it no health reading, or it holds a token the
 * test has no price rule for. */
function rate(account: RawAccount, linkOf: LinkOf): Rated | null {
  if (!account.health || !account.balances) return null
  const assets: Weighed = { fixed: 0, btc: 0 }
  const liabilities: Weighed = { fixed: 0, btc: 0 }
  for (const balance of account.balances) {
    const { amount_usd: usd, weight_maint: weight } = counted(balance)
    if (usd === null || weight === null) return null
    const link = linkOf(balance.mint)
    if (link === null && usd * weight !== 0) return null
    const side = balance.side === 'liability' ? liabilities : assets
    side[link === 'btc' ? 'btc' : 'fixed'] += usd * weight
  }
  return { account, assets, liabilities }
}

const after = (w: Weighed, movePct: number): number => w.fixed + w.btc * (1 + movePct / 100)

/** As the program opens liquidation: weighted deposits no longer above
 * weighted debt. An account without debt is never liquidatable. */
function liquidatable({ assets, liabilities }: Rated, movePct: number): boolean {
  const owed = after(liabilities, movePct)
  return owed !== 0 && after(assets, movePct) <= owed
}

const debtOf = (accounts: RawAccount[]): number => sum(accounts.map((a) => a.borrowed_usd ?? 0))

/** Null where the analytics build serves no balances, or where the unmoved
 * book does not come out as the loan book's own verdicts: the test must
 * agree with its source before it says anything about a move. */
export function stressTest(accounts: RawAccount[], linkOf: LinkOf): Stress | null {
  if (accounts.some((a) => !a.balances)) return null
  const rated = accounts.flatMap((a) => rate(a, linkOf) ?? [])
  if (rated.some((r) => liquidatable(r, 0) === r.account.health!.maintenance.ok)) return null
  const ratedAccounts = rated.map((r) => r.account)
  const unrated = accounts.filter((a) => !ratedAccounts.includes(a))
  return {
    scenarios: BTC_MOVES_PCT.map((move) => {
      const hit = rated.filter((r) => liquidatable(r, move)).map((r) => r.account)
      return { btc_move_pct: move, accounts: hit.length, debt_usd: debtOf(hit) }
    }),
    rated_accounts: rated.length,
    rated_debt_usd: debtOf(ratedAccounts),
    unrated_accounts: unrated.length,
    unrated_debt_usd: debtOf(unrated),
  }
}
