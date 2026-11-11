import type { HealthBandId, LoanBook } from '../src/data/snapshot.js'
import type { RawLoanBook } from './analytics.js'
import { sum } from './series.js'

// The loan book in aggregate. Accounts and wallets are counted, never named.

type RawAccount = RawLoanBook['accounts'][number]

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

export function summarizeLoanBook(book: RawLoanBook): LoanBook {
  const buffers = book.accounts.flatMap((a) => a.health?.maintenance.health_factor ?? [])
  return {
    accounts: book.accounts.length,
    wallets: new Set(book.accounts.map((a) => a.authority)).size,
    health_bands: BAND_ORDER.map((id) => {
      const inBand = book.accounts.filter((a) => bandOf(a) === id)
      return { id, accounts: inBand.length, borrowed_usd: sum(inBand.map((a) => a.borrowed_usd ?? 0)) }
    }),
    lowest_buffer_pct: buffers.length > 0 ? Math.min(...buffers) * 100 : null,
  }
}
