import type { Market, Snapshot } from '../../data/snapshot'
import Panel from '../../components/Panel'
import SourceLine from '../../components/SourceLine'
import { definitions } from '../../lib/definitions'
import { fmtPct, fmtToken, fmtUsd } from '../../lib/format'
import { analyticsLinks } from '../../lib/links'
import { palette } from '../../theme'

/** For each market holding deposits: how much of what was supplied is still there to withdraw. */
export default function Liquidity({ data }: { data: Snapshot }) {
  const funded = data.lend.markets.filter((m) => m.supplied > 0)
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
        />
      }
    >
      <ul className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
        {funded.map((m) => (
          <MarketLiquidity key={m.address} market={m} />
        ))}
      </ul>
    </Panel>
  )
}

function MarketLiquidity({ market: m }: { market: Market }) {
  const availablePct = 100 - m.utilization_pct
  return (
    <li className="min-w-0 text-[13px]">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{m.symbol}</span>
        <span className="num text-right">
          <span className="text-[15px] font-medium">
            {m.available_usd !== null ? fmtUsd(m.available_usd) : fmtToken(m.supplied - m.borrowed, m.symbol)}
          </span>{' '}
          <span className="text-ink-2">
            available · {fmtPct(availablePct)} of {m.supplied_usd !== null ? fmtUsd(m.supplied_usd) : 'what is'} supplied
          </span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-soft-2" aria-hidden="true">
        <div className="h-1.5 rounded-full" style={{ width: `${availablePct}%`, background: palette[0] }} />
      </div>
    </li>
  )
}
