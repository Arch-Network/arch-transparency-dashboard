import type { LoanBook, Stress as StressTest, StressScenario } from '../../data/snapshot'
import DataTable, { type Column } from '../../components/DataTable'
import Panel from '../../components/Panel'
import SourceLine from '../../components/SourceLine'
import { definitions } from '../../lib/definitions'
import { fmtNum, fmtPct, fmtUsd } from '../../lib/format'

interface Props {
  book: LoanBook
  stress: StressTest
  /** The loan book on the analytics API. */
  apiHref: string
}

const moveLabel = (pct: number): string =>
  pct === 0 ? 'No move (now)' : `BTC ${pct < 0 ? 'falls' : 'rises'} ${Math.abs(pct)}%`

/** The debt that could be liquidated after a move in the BTC price, with the
 * assumptions beside the result. Counts and totals only. */
export default function Stress({ book, stress, apiHref }: Props) {
  const columns: Column<StressScenario>[] = [
    { key: 'move', header: 'If', cell: (s) => moveLabel(s.btc_move_pct) },
    { key: 'accounts', header: 'Liquidatable accounts', primary: true, cell: (s) => fmtNum(s.accounts) },
    { key: 'debt', header: 'Their debt', primary: true, cell: (s) => fmtUsd(s.debt_usd) },
    {
      key: 'share',
      header: 'Share of debt',
      primary: true,
      cell: (s) => fmtPct(book.debt_usd > 0 ? (s.debt_usd / book.debt_usd) * 100 : 0),
    },
  ]
  const unread = book.health_bands.find((b) => b.id === 'unrated')?.accounts ?? 0
  return (
    <Panel
      id="stress"
      title="If the BTC price moved"
      subtitle="The debt in accounts that could be liquidated after a move in BTC, with nothing else changing. A calculation on today’s loan book, not a forecast."
      definition={definitions.stress}
      source={
        <SourceLine
          from="Arch Prime Analytics, worked out by this dashboard"
          links={[{ label: 'Accounts in debt (API)', href: apiHref }]}
          definition={definitions.stress}
        />
      }
    >
      <DataTable columns={columns} rows={stress.scenarios} rowKey={(s) => String(s.btc_move_pct)} tableFrom="sm" />
      <div className="mt-3 max-w-3xl text-xs text-ink-2">
        <p className="font-medium text-ink">What this assumes</p>
        <ul className="mt-1 list-disc space-y-1 pl-4">
          <li>aBTC and primeBTC move one for one with BTC. aUSD and primeUSD stay at $1</li>
          <li>
            Each account is taken whole, with the collateral and liability weights the program applies to it, e-mode
            included
          </li>
          <li>
            Values are at Arch Prime Analytics’ reference prices, not the program’s oracle, which applies a price bias
            against the account. The results are slightly optimistic
          </li>
          <li>
            Nothing else changes: no repayment, no new borrowing, no interest, and no liquidation setting off another
          </li>
          <li>Moves run both ways because aBTC is also borrowed: a rise increases what those accounts owe</li>
          <li>Debt is shown at today’s prices in every row</li>
          {stress.unrated_accounts > 0 && (
            <li>
              Not rated, and in no row: {fmtNum(stress.unrated_accounts)}{' '}
              {stress.unrated_accounts === 1 ? 'account' : 'accounts'} owing {fmtUsd(stress.unrated_debt_usd)}.{' '}
              {stress.unrated_accounts === unread
                ? 'No health reading is served for an account holding a token that has no reference price'
                : 'An account is not rated when it has no health reading, or holds a token this test has no price rule for'}
            </li>
          )}
        </ul>
      </div>
    </Panel>
  )
}
