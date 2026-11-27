import type { PerpsSnapshot } from '../../data/perps'
import type { SnapshotMeta } from '../../data/snapshot'
import HeadlineMetric from '../../components/HeadlineMetric'
import Panel from '../../components/Panel'
import SourceLine from '../../components/SourceLine'
import { fmtNum, fmtSpan, fmtTs, fmtUsd } from '../../lib/format'
import { explorerLink, perpsLinks } from '../../lib/links'
import { perpsDefinitions } from '../../lib/perpsDefinitions'

/** Engine health, maker backing & margin netting, and on-chain Exchange settlement parity. */
export default function ExchangeHealth({ perps, meta }: { perps: PerpsSnapshot; meta: SnapshotMeta }) {
  const api = perpsLinks(meta)
  const onChain = perps.on_chain
  const coverageRatio =
    perps.maker_requirement_usd > 0 ? perps.maker_equity_usd / perps.maker_requirement_usd : null
  const settleDelta = onChain !== null ? perps.settle_seq - onChain.settle_seq : null

  const statusLabel = perps.halted
    ? `Halted (${perps.halted})`
    : onChain?.paused
      ? 'Paused on chain'
      : 'Operational'

  const settleNote = onChain
    ? settleDelta === 0
      ? `Synced with on-chain Exchange account (#${fmtNum(onChain.settle_seq)})`
      : `Engine #${fmtNum(perps.settle_seq)} vs chain #${fmtNum(onChain.settle_seq)} (${settleDelta! > 0 ? `+${settleDelta}` : settleDelta} batch lag)`
    : `Engine batch #${fmtNum(perps.settle_seq)} (on-chain RPC unread)`

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <Panel
        id="perps-backing"
        title="Maker backing & margin"
        subtitle="Single-maker collateral and netted margin requirement beside unnetted taker margin"
        definition={perpsDefinitions.makerBacking}
        source={
          <SourceLine
            from="Arch Perps Engine"
            links={api ? [{ label: 'Stats (API)', href: api.stats }, { label: 'Info (API)', href: api.info }] : []}
          />
        }
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <HeadlineMetric
            size="figure"
            label="Maker equity"
            value={fmtUsd(perps.maker_equity_usd)}
            note={
              coverageRatio !== null
                ? `${coverageRatio >= 100 ? Math.round(coverageRatio) : coverageRatio.toFixed(1)}× required margin`
                : 'No active margin requirement'
            }
          />
          <HeadlineMetric
            size="figure"
            label="Maker margin req."
            value={fmtUsd(perps.maker_requirement_usd)}
            note={`Net notional ${fmtUsd(perps.net_notional_usd)}`}
          />
          <HeadlineMetric
            size="figure"
            label="Unnetted req."
            value={fmtUsd(perps.unnetted_requirement_usd)}
            note="Taker initial margin on gross OI"
          />
          <HeadlineMetric
            size="figure"
            label="Insurance fund"
            value={fmtUsd(perps.insurance_fund_usd)}
            note={`Collateral: ${perps.collateral_symbol}`}
          />
          <HeadlineMetric
            size="figure"
            label="Accounts"
            value={fmtNum(perps.accounts)}
            note="Registered collateral accounts"
          />
          <HeadlineMetric
            size="figure"
            label="Open orders"
            value={fmtNum(perps.open_orders)}
            note="Resting limit & stop orders"
          />
        </div>
      </Panel>

      <Panel
        id="perps-settlement"
        title="Engine & on-chain settlement"
        subtitle="Live matching engine status checked against the on-chain Exchange account on Arch"
        definition={perpsDefinitions.settlement}
        chip={statusLabel}
        source={
          <SourceLine
            from={onChain ? 'Arch Perps Engine · Arch RPC' : 'Arch Perps Engine'}
            links={[
              ...(api ? [{ label: 'Health (API)', href: api.health }] : []),
              { label: 'Perps program', href: explorerLink(meta, 'programs', perps.program) },
              { label: 'Exchange account', href: explorerLink(meta, 'accounts', perps.exchange) },
            ]}
          />
        }
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <HeadlineMetric
            size="figure"
            label="Settlement batch"
            value={`#${fmtNum(perps.settle_seq)}`}
            note={settleNote}
          />
          <HeadlineMetric
            size="figure"
            label="Markets priced / quoted"
            value={`${fmtNum(perps.markets_priced)} / ${fmtNum(perps.markets_quoted)}`}
            note={`Of ${fmtNum(perps.markets_total)} listed (${fmtNum(perps.crypto_markets)} crypto · ${fmtNum(perps.tradfi_markets)} TradFi)`}
          />
          <HeadlineMetric
            size="figure"
            label="Escape-hatch delay"
            value={onChain ? fmtSpan(onChain.withdraw_delay_s * 1000) : '—'}
            note={
              onChain
                ? `Self-custody exit without operator · ${onChain.paused ? 'Paused' : 'Active'}`
                : 'On-chain Exchange account unread'
            }
          />
          <HeadlineMetric
            size="figure"
            label="On-chain vault balance"
            value={onChain ? fmtUsd(onChain.total_balance_usd) : '—'}
            note={onChain ? `Read ${fmtTs(onChain.read_at)}` : 'Read via Arch RPC when configured'}
          />
          <HeadlineMetric
            size="figure"
            label="Collateral token"
            value={perps.collateral_symbol}
            note={`${perps.collateral_decimals} decimals · valued at $1`}
          />
          <HeadlineMetric
            size="figure"
            label="Engine build"
            value={perps.build_sha ? perps.build_sha.slice(0, 7) : '—'}
            note={`Network: ${perps.network}`}
          />
        </div>
      </Panel>
    </div>
  )
}
