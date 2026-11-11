import type { ExposureLine, HealthBandId, LoanBook } from '../src/data/snapshot.js'
import type { RawAccount, RawBalanceSide, RawLoanBook } from './rawLoanBook.js'
import { sum } from './series.js'
import { stressTest, type LinkOf } from './stress.js'

// The loan book in aggregate. Accounts and wallets are counted, never named.

/** Upper bounds of the liquidation-buffer bands, riskiest first. */
const BANDS: { id: HealthBandId; below: number }[] = [
  { id: 'under_10', below: 0.1 },
  { id: 'from_10_to_25', below: 0.25 },
  { id: 'from_25_to_50', below: 0.5 },
  { id: 'over_50', below: Infinity },
]

const BAND_ORDER: HealthBandId[] = ['liquidatable', ...BANDS.map((b) => b.id), 'unrated']

function bandOf({ health }: RawAccount): HealthBandId {
  if (!health) return 'unrated'
  if (!health.maintenance.ok) return 'liquidatable'
  const buffer = health.maintenance.health_factor
  if (buffer === null) return 'unrated'
  return BANDS.find((b) => buffer < b.below)!.id
}

/** The largest total owed by one wallet, its accounts taken together. */
function largestBorrowerUsd(accounts: RawAccount[]): number {
  const owed = new Map<string, number>()
  for (const a of accounts) owed.set(a.authority, (owed.get(a.authority) ?? 0) + (a.borrowed_usd ?? 0))
  return Math.max(0, ...owed.values())
}

/** One side of every balance in the book, summed by market: the priced
 * amounts largest first, and the markets holding an amount without a price. */
function bySymbol(
  accounts: RawAccount[],
  side: 'asset' | 'liability',
  symbolOf: (mint: string) => string,
): { lines: ExposureLine[]; unpriced: string[] } {
  const usd = new Map<string, number>()
  const unpriced = new Set<string>()
  for (const balance of accounts.flatMap((a) => a.balances ?? [])) {
    const held: RawBalanceSide = balance[side]
    if (Number(held.amount) === 0) continue
    const symbol = symbolOf(balance.mint)
    if (held.amount_usd === null) unpriced.add(symbol)
    else usd.set(symbol, (usd.get(symbol) ?? 0) + held.amount_usd)
  }
  const lines = [...usd].map(([symbol, total]) => ({ symbol, usd: total })).sort((x, y) => y.usd - x.usd)
  return { lines, unpriced: [...unpriced] }
}

export function summarizeLoanBook(book: RawLoanBook, symbolOf: (mint: string) => string, linkOf: LinkOf): LoanBook {
  const buffers = book.accounts.flatMap((a) => a.health?.maintenance.health_factor ?? [])
  const debt = sum(book.accounts.map((a) => a.borrowed_usd ?? 0))
  const deposited = bySymbol(book.accounts, 'asset', symbolOf)
  return {
    accounts: book.accounts.length,
    wallets: new Set(book.accounts.map((a) => a.authority)).size,
    health_bands: BAND_ORDER.map((id) => {
      const inBand = book.accounts.filter((a) => bandOf(a) === id)
      return { id, accounts: inBand.length, borrowed_usd: sum(inBand.map((a) => a.borrowed_usd ?? 0)) }
    }),
    lowest_buffer_pct: buffers.length > 0 ? Math.min(...buffers) * 100 : null,
    debt_usd: debt,
    largest_borrower_pct: debt > 0 ? (largestBorrowerUsd(book.accounts) / debt) * 100 : null,
    owed: bySymbol(book.accounts, 'liability', symbolOf).lines,
    deposited: deposited.lines,
    deposited_unpriced: deposited.unpriced,
    stress: stressTest(book.accounts, linkOf),
  }
}
