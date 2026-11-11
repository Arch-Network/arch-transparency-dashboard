import type { ExposureLine, LoanBook } from '../../data/snapshot'
import HeadlineMetric from '../../components/HeadlineMetric'
import Panel from '../../components/Panel'
import SourceLine from '../../components/SourceLine'
import { definitions } from '../../lib/definitions'
import { fmtNum, fmtPct, fmtUsd } from '../../lib/format'

interface Props {
  book: LoanBook
  /** The loan book on the analytics API. */
  apiHref: string
}

/** How concentrated the debt is, and what it is owed in and backed by. In
 * aggregate: no account or wallet is named. */
export default function Concentration({ book, apiHref }: Props) {
  return (
    <Panel
      id="concentration"
      title="Concentration"
      subtitle="How much of the debt one borrower owes, and what the accounts in debt owe and hold. No account or wallet is named."
      definition={definitions.concentration}
      source={
        <SourceLine
          from="Arch Prime Analytics, added up by this dashboard"
          links={[{ label: 'Accounts in debt (API)', href: apiHref }]}
          definition={definitions.concentration}
        />
      }
    >
      <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-3">
        {book.largest_borrower_pct !== null && (
          <HeadlineMetric
            size="figure"
            label="Largest borrower’s share of debt"
            value={fmtPct(book.largest_borrower_pct)}
            note={`One wallet’s accounts together, of ${fmtUsd(book.debt_usd)} owed by ${fmtNum(book.wallets)} wallets`}
          />
        )}
        {book.owed.length > 0 && <Lines title="What is owed" lines={book.owed} />}
        <Lines
          title="What the accounts in debt hold"
          lines={book.deposited}
          note={
            book.deposited_unpriced.length > 0
              ? `Not shown: ${book.deposited_unpriced.join(' and ')}, which ${book.deposited_unpriced.length > 1 ? 'have' : 'has'} no reference price`
              : undefined
          }
        />
      </div>
    </Panel>
  )
}

/** Amounts by token with each one's share of their total. */
function Lines({ title, lines, note }: { title: string; lines: ExposureLine[]; note?: string }) {
  const total = lines.reduce((sum, l) => sum + l.usd, 0)
  return (
    <div className="min-w-0 text-[13px]">
      <h4 className="kpi-label">{title}</h4>
      <ul className="mt-1 divide-y divide-line">
        {lines.map((l) => (
          <li key={l.symbol} className="flex items-baseline justify-between gap-3 py-1.5">
            <span className="font-medium">{l.symbol}</span>
            <span className="num">
              {fmtUsd(l.usd)} <span className="text-ink-2">· {fmtPct(total > 0 ? (l.usd / total) * 100 : 0)}</span>
            </span>
          </li>
        ))}
      </ul>
      {note && <p className="mt-1 text-xs text-ink-2">{note}</p>}
    </div>
  )
}
