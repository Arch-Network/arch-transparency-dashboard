import type { Market, Snapshot } from '../../data/snapshot'
import DataTable, { Stacked, type Column } from '../../components/DataTable'
import Panel from '../../components/Panel'
import SourceLine from '../../components/SourceLine'
import { definitions } from '../../lib/definitions'
import { fmtPct, fmtToken, fmtUsd } from '../../lib/format'
import { analyticsLinks } from '../../lib/links'
import { afterWithdrawal } from '../../lib/withdrawal'
import { palette } from '../../theme'

/** Shares of a market's deposits withdrawn at once, in percent. */
const WITHDRAWALS_PCT = [25, 50, 75]

/** For each market holding deposits: how much of what was supplied is still
 * there to withdraw, and what a large withdrawal would leave. */
export default function Liquidity({ data }: { data: Snapshot }) {
  const funded = data.lend.markets.filter((m) => m.supplied > 0)
  const lent = funded.filter((m) => m.borrowed_usd !== null && m.borrowed_usd > 0)
  return (
    <Panel
      id="liquidity"
      title="Liquidity by market"
      subtitle="What is supplied and not borrowed: the share of deposits that can be withdrawn now."
      definition={definitions.availableLiquidity}
      source={
        <SourceLine
          from="Arch Prime Analytics"
          links={[{ label: 'Markets (API)', href: analyticsLinks(data.meta).markets }]}
          definition={definitions.withdrawal}
        />
      }
    >
      <ul className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
        {funded.map((m) => (
          <MarketLiquidity key={m.address} market={m} />
        ))}
      </ul>
      {lent.length > 0 && <AfterWithdrawals markets={lent} />}
    </Panel>
  )
}

/** Utilization in each market with debt if a share of its deposits left. */
function AfterWithdrawals({ markets }: { markets: Market[] }) {
  const columns: Column<Market>[] = [
    { key: 'market', header: 'Market', cell: (m) => m.symbol },
    { key: 'now', header: 'Utilization now', cell: (m) => fmtPct(m.utilization_pct) },
    ...WITHDRAWALS_PCT.map((share): Column<Market> => ({
      key: `after-${share}`,
      header: `If ${share}% of deposits left`,
      primary: true,
      cell: (m) => {
        const after = afterWithdrawal(m.supplied_usd ?? 0, m.borrowed_usd ?? 0, share)
        return (
          <Stacked
            top={fmtPct(after.utilization_pct)}
            sub={after.unmet_usd > 0 ? `${fmtUsd(after.unmet_usd)} would wait for repayments` : 'met in full'}
          />
        )
      },
    })),
  ]
  return (
    <div className="mt-5 border-t border-line pt-3">
      <DataTable
        columns={columns}
        rows={markets}
        rowKey={(m) => m.address}
        tableFrom="sm"
        caption="Utilization after a withdrawal, the debt unchanged"
      />
      <p className="mt-2 max-w-3xl text-xs text-ink-2 sm:px-2">
        Only what is not borrowed can be withdrawn. A request for more is met in part and the rest waits until
        borrowers repay. Markets with no debt are not listed: all of their deposits can be withdrawn
      </p>
    </div>
  )
}

function MarketLiquidity({ market: m }: { market: Market }) {
  const availablePct = 100 - m.utilization_pct
  return (
    <li className="min-w-0 text-[13px]">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{m.symbol}</span>
        <span className="num">
          <span className="text-[15px] font-medium">
            {m.available_usd !== null ? fmtUsd(m.available_usd) : fmtToken(m.supplied - m.borrowed, m.symbol)}
          </span>{' '}
          <span className="text-ink-2">available</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-soft-2" aria-hidden="true">
        <div className="h-1.5 rounded-full" style={{ width: `${availablePct}%`, background: palette[0] }} />
      </div>
      <div className="num mt-1 text-xs text-ink-2">
        {fmtPct(availablePct)} of the {m.supplied_usd !== null ? fmtUsd(m.supplied_usd) : fmtToken(m.supplied, m.symbol)}{' '}
        supplied
      </div>
    </li>
  )
}
