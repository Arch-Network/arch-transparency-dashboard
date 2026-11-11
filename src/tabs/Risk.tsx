import type { Lend, Snapshot } from '../data/snapshot'
import { fmtUsd, fmtPct, fmtNum } from '../lib/format'
import { definitions, liveDefinitions } from '../lib/definitions'
import KpiCard from '../components/KpiCard'
import LoanHealth from '../components/LoanHealth'
import MarketsTable from '../components/MarketsTable'
import RiskParameters from '../components/RiskParameters'
import MarketRates from '../components/MarketRates'

interface Props {
  data: Snapshot
  onMethodology: () => void
}

export default function Risk({ data, onMethodology }: Props) {
  const { lend } = data
  const book = lend.loan_book
  const withRates = lend.markets.filter((m) => m.rates_daily.length > 0)
  const unpriced = lend.markets.filter((m) => m.supplied > 0 && m.price === null).length

  return (
    <div className="space-y-3">
      <div className="pb-1">
        <h2 className="text-[26px] font-medium leading-tight">Risk</h2>
        <p className="mt-1 text-[13px] text-ink-2">
          Arch Lend in aggregate: what is supplied and borrowed, the risk parameters in force, and every
          liquidation to date.
        </p>
      </div>

      <div className="card grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
        <KpiCard
          label="Total Supplied"
          value={fmtUsd(lend.supplied_usd)}
          sub={<span>{unpriced === 0 ? 'across all markets' : `${unpriced} unpriced not included`}</span>}
          onMethodology={onMethodology}
        />
        <KpiCard
          label="Debt Outstanding"
          value={fmtUsd(lend.borrowed_usd)}
          sub={<span>currently borrowed</span>}
          onMethodology={onMethodology}
        />
        <KpiCard
          label="Utilization"
          value={fmtPct(lend.utilization_pct)}
          tooltip={definitions.utilization}
          onMethodology={onMethodology}
          sub={<span>borrowed ÷ supplied</span>}
        />
        <KpiCard
          label="Available Liquidity"
          value={fmtUsd(lend.available_usd)}
          tooltip={definitions.availableLiquidity}
          onMethodology={onMethodology}
          sub={<span>supplied and not borrowed</span>}
        />
        <KpiCard
          label="Borrowed to Date"
          value={fmtUsd(lend.borrow_volume_usd)}
          tooltip={definitions.loansIssued}
          onMethodology={onMethodology}
          sub={<span>{fmtNum(lend.borrow_events)} borrows, all-time</span>}
        />
        <KpiCard
          label={book ? 'Accounts in Debt' : 'Borrowing Accounts (all-time)'}
          value={fmtNum(book ? book.accounts : lend.borrowers)}
          tooltip={liveDefinitions(data).borrowers}
          onMethodology={onMethodology}
          sub={
            <span>
              {book
                ? `owned by ${fmtNum(book.wallets)} wallets · ${fmtNum(lend.borrowers)} accounts have ever borrowed`
                : 'have ever borrowed'}
            </span>
          }
        />
        <KpiCard
          label="Liquidations"
          value={fmtNum(lend.liquidation_events)}
          sub={<span>{fmtUsd(lend.liquidation_repaid_usd)} of debt repaid</span>}
          onMethodology={onMethodology}
        />
        <KpiCard
          label="Bad Debt"
          value={fmtUsd(lend.bad_debt_usd)}
          accent={lend.bad_debt_usd === 0 ? 'green' : 'orange'}
          tooltip={definitions.badDebt}
          onMethodology={onMethodology}
          sub={<span>{fmtNum(lend.bankruptcy_events)} bankruptcies</span>}
        />
      </div>

      <section className="card min-w-0 p-4">
        <h3 className="text-[15px] font-medium">Markets</h3>
        <p className="mt-0.5 text-[13px] text-ink-2">Every Arch Lend market, largest first.</p>
        <div className="mt-3">
          <MarketsTable markets={lend.markets} leftOutOfTvl={data.overview.tvl_left_out.map((m) => m.symbol)} />
        </div>
      </section>

      <section className="card min-w-0 p-4">
        <h3 className="text-[15px] font-medium">Risk Parameters</h3>
        <p className="mt-0.5 text-[13px] text-ink-2">As configured in the Arch Lend program.</p>
        <div className="mt-3">
          <RiskParameters markets={lend.markets} pairings={lend.emode_pairings} />
        </div>
      </section>

      {book && <LoanHealth book={book} />}

      <MarketRates markets={withRates} onMethodology={onMethodology} />

      <LiquidationHistory lend={lend} />
    </div>
  )
}

function LiquidationHistory({ lend }: { lend: Lend }) {
  return (
    <section className="card min-w-0 p-4">
      <h3 className="text-[15px] font-medium">Liquidation History</h3>
      {lend.liquidation_events === 0 ? (
        <div className="mt-3 rounded-control border border-dashed border-line-2 px-4 py-5 text-center text-[13px]">
          <p className="font-medium">No liquidations to date</p>
          <p className="mx-auto mt-1 max-w-xl text-ink-2">
            No Arch Lend account has been liquidated. When one is, the collateral seized and the debt repaid
            appear here.
          </p>
        </div>
      ) : (
        <dl className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            ['Liquidations', fmtNum(lend.liquidation_events)],
            ['Collateral seized', fmtUsd(lend.liquidation_seized_usd)],
            ['Debt repaid', fmtUsd(lend.liquidation_repaid_usd)],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[13px] text-ink-2">{label}</dt>
              <dd className="num text-xl font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
