import type { PerpsSnapshot } from '../../data/perps'
import type { SnapshotMeta } from '../../data/snapshot'
import HeadlineMetric from '../../components/HeadlineMetric'
import Panel from '../../components/Panel'
import SourceLine from '../../components/SourceLine'
import { Badge, KeyValueList, ProgressBar, type Tone } from '../../components/ui'
import { fmtNum, fmtPct, fmtSpan, fmtTs, fmtUsd } from '../../lib/format'
import { explorerLink, perpsLinks } from '../../lib/links'
import { perpsDefinitions } from '../../lib/perpsDefinitions'
import { productColors } from '../../theme'

/** Engine health, maker backing & margin netting, and on-chain Exchange settlement parity. */
export default function ExchangeHealth({ perps, meta }: { perps: PerpsSnapshot; meta: SnapshotMeta }) {
  const api = perpsLinks(meta)
  const onChain = perps.on_chain
  const coverageRatio =
    perps.maker_requirement_usd > 0 ? perps.maker_equity_usd / perps.maker_requirement_usd : null
  const marginUsagePct =
    perps.maker_equity_usd > 0 ? Math.min(100, (perps.maker_requirement_usd / perps.maker_equity_usd) * 100) : 0
  const settleDelta = onChain !== null ? perps.settle_seq - onChain.settle_seq : null

  const statusLabel = perps.halted
    ? `Halted (${perps.halted})`
    : onChain?.paused
      ? 'Paused on chain'
      : 'Operational'

  const statusTone: Tone = perps.halted ? 'down' : onChain?.paused ? 'warn' : 'up'

  const settleNote = onChain
    ? settleDelta === 0
      ? `Synced with on-chain Exchange account (#${fmtNum(onChain.settle_seq)})`
      : `Engine #${fmtNum(perps.settle_seq)} vs chain #${fmtNum(onChain.settle_seq)} (${settleDelta! > 0 ? `+${settleDelta}` : settleDelta} batch lag)`
    : `Engine batch #${fmtNum(perps.settle_seq)} (on-chain RPC unread)`

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
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
        </div>

        {perps.maker_equity_usd > 0 && (
          <div className="mt-4 space-y-1.5">
            <div className="flex items-baseline justify-between gap-2 text-[12px] text-ink-2">
              <span>Maker margin usage</span>
              <span className="num font-medium text-ink">{fmtPct(marginUsagePct, 2)}</span>
            </div>
            <ProgressBar pct={marginUsagePct} color={productColors.perps} />
          </div>
        )}

        <KeyValueList
          bleed
          className="mt-4 border-t border-line"
          rows={[
            {
              label: 'Unnetted taker req.',
              value: fmtUsd(perps.unnetted_requirement_usd),
              sub: 'Taker initial margin on gross OI',
            },
            {
              label: 'Insurance fund',
              value: fmtUsd(perps.insurance_fund_usd),
              sub: `Collateral: ${perps.collateral_symbol}`,
            },
            {
              label: 'Accounts',
              value: fmtNum(perps.accounts),
              sub: 'Registered collateral accounts',
            },
            {
              label: 'Open orders',
              value: fmtNum(perps.open_orders),
              sub: 'Resting limit & stop orders',
            },
          ]}
        />
      </Panel>

      <Panel
        id="perps-settlement"
        title="Engine & on-chain settlement"
        subtitle="Live matching engine status checked against the on-chain Exchange account on Arch"
        definition={perpsDefinitions.settlement}
        actions={
          <Badge tone={statusTone}>
            <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
            {statusLabel}
          </Badge>
        }
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
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <HeadlineMetric
            size="figure"
            label="Settlement batch"
            value={`#${fmtNum(perps.settle_seq)}`}
            note={settleNote}
          />
          <HeadlineMetric
            size="figure"
            label="On-chain vault balance"
            value={onChain ? fmtUsd(onChain.total_balance_usd) : '—'}
            note={onChain ? `Read ${fmtTs(onChain.read_at)}` : 'Read via Arch RPC when configured'}
          />
        </div>

        <KeyValueList
          bleed
          className="mt-4 border-t border-line"
          rows={[
            {
              label: 'Markets priced / quoted',
              value: `${fmtNum(perps.markets_priced)} / ${fmtNum(perps.markets_quoted)}`,
              sub: `Of ${fmtNum(perps.markets_total)} listed (${fmtNum(perps.crypto_markets)} crypto · ${fmtNum(perps.tradfi_markets)} TradFi)`,
            },
            {
              label: 'Escape-hatch delay',
              value: onChain ? fmtSpan(onChain.withdraw_delay_s * 1000) : '—',
              sub: onChain
                ? `Self-custody exit without operator · ${onChain.paused ? 'Paused' : 'Active'}`
                : 'On-chain Exchange account unread',
            },
            {
              label: 'Collateral token',
              value: perps.collateral_symbol,
              sub: `${perps.collateral_decimals} decimals · valued at $1`,
            },
            {
              label: 'Engine build',
              value: perps.build_sha ? <span className="mono">{perps.build_sha.slice(0, 7)}</span> : '—',
              sub: `Network: ${perps.network}`,
            },
          ]}
        />
      </Panel>
    </div>
  )
}
