import type { Snapshot } from '../../data/snapshot'
import HeadlineMetric from '../../components/HeadlineMetric'
import Panel from '../../components/Panel'
import { definitions } from '../../lib/definitions'
import { fmtNum, fmtPct, fmtUsd } from '../../lib/format'
import { usePageHref } from '../../lib/range'

/** Arch Lend's exposure in a few figures, with the way to the Risk page. */
export default function RiskSnapshot({ data }: { data: Snapshot }) {
  const { lend } = data
  const href = usePageHref()
  const lowest = lend.loan_book?.lowest_buffer_pct ?? null
  return (
    <Panel
      id="risk"
      title="Lending risk"
      subtitle="Arch Lend now, and what has happened to date."
      actions={
        <a className="btn" href={href('risk')}>
          Risk page
        </a>
      }
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
        <HeadlineMetric
          size="figure"
          label="Debt outstanding"
          value={fmtUsd(lend.borrowed_usd)}
          definition={definitions.debt}
          note={`against ${fmtUsd(lend.supplied_usd)} supplied`}
        />
        <HeadlineMetric
          size="figure"
          label="Utilization"
          value={fmtPct(lend.utilization_pct)}
          definition={definitions.utilization}
          note="borrowed ÷ supplied"
        />
        {lowest !== null && (
          <HeadlineMetric
            size="figure"
            label="Smallest liquidation buffer"
            value={fmtPct(lowest)}
            definition={definitions.liquidationBuffer}
            note="among the accounts in debt"
          />
        )}
        <HeadlineMetric
          size="figure"
          label="Liquidations to date"
          value={fmtNum(lend.liquidation_events)}
          note={`${fmtUsd(lend.liquidation_repaid_usd)} of debt repaid`}
        />
        <HeadlineMetric
          size="figure"
          label="Bad debt to date"
          value={fmtUsd(lend.bad_debt_usd)}
          definition={definitions.badDebt}
          note={`${fmtNum(lend.bankruptcy_events)} bankruptcies`}
        />
      </div>
    </Panel>
  )
}
