import type { PerpsSnapshot } from '../../data/perps'
import HeadlineMetric from '../../components/HeadlineMetric'
import { fmtNum, fmtUsd } from '../../lib/format'
import { perpsDefinitions } from '../../lib/perpsDefinitions'

/** Top four figures for Arch Perps: gross OI, 24h volume, on-chain collateral (or maker equity), and fees/insurance. */
export default function Summary({ perps }: { perps: PerpsSnapshot }) {
  const onChain = perps.on_chain
  const otherCollateral =
    onChain !== null ? Math.max(0, onChain.total_balance_usd - perps.maker_equity_usd) : null

  const sampleMarket = perps.markets[0]
  const feeNote =
    sampleMarket && sampleMarket.taker_fee_bps > 0
      ? `Insurance fund ${fmtUsd(perps.insurance_fund_usd)} · ${sampleMarket.taker_fee_bps} bps taker / ${sampleMarket.liquidation_fee_bps} bps liq`
      : `Insurance fund ${fmtUsd(perps.insurance_fund_usd)}`

  return (
    <section className="grid grid-cols-2 gap-x-6 gap-y-6 border-y border-line py-5 lg:grid-cols-4">
      <HeadlineMetric
        label="Open interest (gross)"
        value={fmtUsd(perps.gross_open_interest_usd)}
        definition={perpsDefinitions.openInterest}
        comparison={
          <>
            Long <span className="num text-ink">{fmtUsd(perps.long_open_interest_usd)}</span> · Short{' '}
            <span className="num text-ink">{fmtUsd(perps.short_open_interest_usd)}</span>
          </>
        }
        note={`Net maker exposure ${fmtUsd(perps.net_notional_usd)} · ${fmtNum(perps.markets_with_oi)} of ${fmtNum(perps.markets_total)} markets with OI`}
      />
      <HeadlineMetric
        label="Trading volume, 24 h"
        value={perps.volume_24h_usd !== null ? fmtUsd(perps.volume_24h_usd) : '—'}
        definition={perpsDefinitions.volume}
        comparison={
          perps.volume_24h_usd !== null ? (
            <>
              Crypto <span className="num text-ink">{fmtUsd(perps.crypto_volume_24h_usd)}</span> · TradFi{' '}
              <span className="num text-ink">{fmtUsd(perps.tradfi_volume_24h_usd)}</span>
            </>
          ) : (
            'Engine still building 24-hour fill window'
          )
        }
        note={`${fmtNum(perps.markets_with_volume_24h)} active markets · ${fmtNum(perps.markets_quoted)}/${fmtNum(perps.markets_total)} quoted`}
      />
      {onChain ? (
        <HeadlineMetric
          label="Vault collateral (on-chain)"
          value={fmtUsd(onChain.total_balance_usd)}
          definition={perpsDefinitions.vaultCollateral}
          comparison={
            <>
              Maker equity <span className="num text-ink">{fmtUsd(perps.maker_equity_usd)}</span>
            </>
          }
          note={
            `${otherCollateral !== null ? `${fmtUsd(otherCollateral)} trader & reserve balances · ` : ''}` +
            `${fmtNum(perps.accounts)} accounts · Separate from protocol TVL`
          }
        />
      ) : (
        <HeadlineMetric
          label="Maker equity"
          value={fmtUsd(perps.maker_equity_usd)}
          definition={perpsDefinitions.makerBacking}
          comparison={
            <>
              Margin required <span className="num text-ink">{fmtUsd(perps.maker_requirement_usd)}</span>
            </>
          }
          note={`${fmtNum(perps.accounts)} accounts · On-chain vault balance unavailable`}
        />
      )}
      <HeadlineMetric
        label="Fees collected"
        value={fmtUsd(perps.fees_collected_usd)}
        definition={perpsDefinitions.insuranceAndFees}
        comparison={
          <>
            Insurance fund <span className="num text-ink">{fmtUsd(perps.insurance_fund_usd)}</span>
          </>
        }
        note={feeNote}
      />
    </section>
  )
}
