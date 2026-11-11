import type { Lend, Snapshot } from '../data/snapshot'
import HeadlineMetric, { Delta } from '../components/HeadlineMetric'
import LoanHealth from '../components/LoanHealth'
import PageHeader from '../components/PageHeader'
import Panel from '../components/Panel'
import RiskParameters from '../components/RiskParameters'
import SourceLine from '../components/SourceLine'
import { definitions, liveDefinitions } from '../lib/definitions'
import { fmtNum, fmtPct, fmtUsd } from '../lib/format'
import { analyticsLinks } from '../lib/links'
import Liquidity from './risk/Liquidity'

/** Arch Lend's exposure: what is owed and by how many, how close accounts are
 * to liquidation, what can be withdrawn, the parameters in force, and the record to date. */
export default function Risk({ data }: { data: Snapshot }) {
  const { lend, meta } = data
  const book = lend.loan_book
  const api = analyticsLinks(meta)
  const unpriced = lend.markets.filter((m) => m.supplied > 0 && m.price === null).length

  return (
    <div className="space-y-3">
      <PageHeader
        title="Risk"
        subtitle="Arch Lend in aggregate: what is owed, how close accounts are to liquidation, what can be withdrawn, and the parameters in force."
      />

      <section className="grid grid-cols-2 gap-x-6 gap-y-6 border-y border-line py-5 lg:grid-cols-4">
        <HeadlineMetric
          label="Debt outstanding"
          value={fmtUsd(lend.borrowed_usd)}
          definition={definitions.debt}
          comparison={
            lend.borrowed_change_24h_pct !== null && (
              <>
                <Delta pct={lend.borrowed_change_24h_pct} neutral /> vs 24 hours ago
              </>
            )
          }
          note={`against ${fmtUsd(lend.supplied_usd)} supplied` + (unpriced > 0 ? `, ${unpriced} unpriced markets not included` : '')}
        />
        <HeadlineMetric
          label="Utilization"
          value={fmtPct(lend.utilization_pct)}
          definition={definitions.utilization}
          note={`${fmtUsd(lend.available_usd)} supplied and not borrowed`}
        />
        <HeadlineMetric
          label={book ? 'Accounts in debt' : 'Borrowing accounts, all-time'}
          value={fmtNum(book ? book.accounts : lend.borrowers)}
          definition={liveDefinitions(data).borrowers}
          note={
            book
              ? `Owned by ${fmtNum(book.wallets)} wallets. ${fmtNum(lend.borrowers)} accounts have ever borrowed.`
              : 'Have ever borrowed, repaid or not'
          }
        />
        {book && book.lowest_buffer_pct !== null && (
          <HeadlineMetric
            label="Smallest liquidation buffer"
            value={fmtPct(book.lowest_buffer_pct)}
            definition={definitions.liquidationBuffer}
            note="The account in debt closest to liquidation, at reference prices"
          />
        )}
      </section>

      {book && <LoanHealth book={book} apiHref={api.loanBook} />}

      <Liquidity data={data} />

      <Panel
        id="parameters"
        title="Risk parameters"
        subtitle="As configured in the Arch Lend program, with each market’s price oracle."
        definition={definitions.oracle}
        source={
          <SourceLine
            from="Arch Prime Analytics"
            links={[{ label: 'Markets (API)', href: api.markets }]}
            definition={definitions.riskWeights}
          />
        }
      >
        <RiskParameters markets={lend.markets} pairings={lend.emode_pairings} />
      </Panel>

      <History lend={lend} apiHref={api.lendingTotals} />
    </div>
  )
}

/** What has happened in Arch Lend since launch. A record, not an assessment. */
function History({ lend, apiHref }: { lend: Lend; apiHref: string }) {
  return (
    <Panel
      id="history"
      title="History to date"
      subtitle="Every borrow, liquidation and write-off since launch. A record of what has happened, not a forecast."
      source={<SourceLine from="Arch Prime Analytics" links={[{ label: 'Lending totals (API)', href: apiHref }]} />}
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
        <HeadlineMetric
          size="figure"
          label="Borrowed to date"
          value={fmtUsd(lend.borrow_volume_usd)}
          definition={definitions.loansIssued}
          note={`${fmtNum(lend.borrow_events)} borrows`}
        />
        <HeadlineMetric size="figure" label="Liquidations" value={fmtNum(lend.liquidation_events)} />
        <HeadlineMetric size="figure" label="Collateral seized" value={fmtUsd(lend.liquidation_seized_usd)} />
        <HeadlineMetric size="figure" label="Debt repaid by liquidation" value={fmtUsd(lend.liquidation_repaid_usd)} />
        <HeadlineMetric
          size="figure"
          label="Bad debt"
          value={fmtUsd(lend.bad_debt_usd)}
          definition={definitions.badDebt}
          note={`${fmtNum(lend.bankruptcy_events)} bankruptcies`}
        />
      </div>
    </Panel>
  )
}
