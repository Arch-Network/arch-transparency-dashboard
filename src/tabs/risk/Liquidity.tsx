import type { Market, Snapshot } from '../../data/snapshot'
import DataTable, { Stacked, type Column } from '../../components/DataTable'
import Panel from '../../components/Panel'
import SourceLine from '../../components/SourceLine'
import { ProgressBar } from '../../components/ui'
import { definitions } from '../../lib/definitions'
import { fmtPct, fmtToken, usdColumn, type UsdFormat } from '../../lib/format'
import { analyticsLinks } from '../../lib/links'
import { afterWithdrawal } from '../../lib/withdrawal'
import { productColors } from '../../theme'

/** Shares of a market's deposits withdrawn at once, in percent. */
const WITHDRAWALS_PCT = [25, 50, 75]

/** For each market holding deposits: how much of what was supplied is still
 * there to withdraw, and what a large withdrawal would leave. */
export default function Liquidity({ data }: { data: Snapshot }) {
  const funded = data.lend.markets.filter((m) => m.supplied > 0)
  const lent = funded.filter((m) => m.borrowed_usd !== null && m.borrowed_usd > 0)
  const usd = usdColumn(funded.flatMap((m) => [m.available_usd, m.supplied_usd]))
  return (
    <Panel
      id="liquidity"
      title="Liquidity by market"
      subtitle="What is supplied and not borrowed: the share of deposits that can be withdrawn now"
      definition={definitions.availableLiquidity}
      source={
        <SourceLine
          from="Arch Prime Analytics"
          links={[{ label: 'Markets (API)', href: analyticsLinks(data.meta).markets }]}
          definition={definitions.withdrawal}
        />
      }
    >
      <ul className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
        {funded.map((m) => (
          <MarketLiquidity key={m.address} market={m} usd={usd} />
        ))}
      </ul>
      {lent.length > 0 && <AfterWithdrawals markets={lent} />}
    </Panel>
  )
}

/** Utilization in each market with debt if a share of its deposits were withdrawn. */
function AfterWithdrawals({ markets }: { markets: Market[] }) {
  const columns: Column<Market>[] = [
    { key: 'market', header: 'Market', cell: (m) => m.symbol },
    { key: 'now', header: 'Utilization now', cell: (m) => fmtPct(m.utilization_pct) },
    ...WITHDRAWALS_PCT.map((share): Column<Market> => {
      const after = (m: Market) => afterWithdrawal(m.supplied_usd ?? 0, m.borrowed_usd ?? 0, share)
      const unmet = usdColumn(markets.map((m) => after(m).unmet_usd))
      return {
        key: `after-${share}`,
        header: `If ${share}% were withdrawn`,
        primary: true,
        cell: (m) => {
          const { utilization_pct, unmet_usd } = after(m)
          return (
            <Stacked
              top={fmtPct(utilization_pct)}
              sub={unmet_usd > 0 ? `${unmet(unmet_usd)} would wait for repayments` : 'met in full'}
            />
          )
        },
      }
    }),
  ]
  return (
    <div className="mt-6 border-t border-line pt-5">
      <DataTable
        columns={columns}
        rows={markets}
        rowKey={(m) => m.address}
        tableFrom="sm"
        caption="Utilization after a withdrawal, the debt unchanged"
      />
      <p className="mt-3 max-w-3xl text-[12px] leading-relaxed text-ink-3">
        Only what is not borrowed can be withdrawn. A request for more is met in part and the rest waits until
        borrowers repay. Markets with no debt are not listed: all of their deposits can be withdrawn.
      </p>
    </div>
  )
}

function MarketLiquidity({ market: m, usd }: { market: Market; usd: UsdFormat }) {
  const availablePct = 100 - m.utilization_pct
  return (
    <li className="min-w-0 text-[13.5px]">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium text-ink">{m.symbol}</span>
        <span className="num">
          <span className="text-[15px] font-medium text-ink">
            {m.available_usd !== null ? usd(m.available_usd) : fmtToken(m.supplied - m.borrowed, m.symbol)}
          </span>{' '}
          <span className="font-sans text-[12.5px] text-ink-3">available</span>
        </span>
      </div>
      <ProgressBar pct={availablePct} color={productColors.lend} className="mt-2.5" />
      <div className="num mt-1.5 text-[12px] text-ink-3">
        {fmtPct(availablePct)} of {m.supplied_usd !== null ? usd(m.supplied_usd) : fmtToken(m.supplied, m.symbol)} supplied
      </div>
    </li>
  )
}
