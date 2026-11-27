import type { PerpsSnapshot } from '../../data/perps'
import HeadlineMetric from '../../components/HeadlineMetric'
import { StatStrip } from '../../components/ui'
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
      ? `${sampleMarket.taker_fee_bps} bps taker · ${sampleMarket.liquidation_fee_bps} bps liquidation fee`
      : `Collateral: ${perps.collateral_symbol}`

  return (
    <StatStrip columns={4}>
      <HeadlineMetric
        label="Open interest (gross)"
        value={fmtUsd(perps.gross_open_interest_usd)}
        definition={perpsDefinitions.openInterest}
        comparison={
          <>
            <span className="num text-ink-2">
              Long <span className="font-medium text-ink">{fmtUsd(perps.long_open_interest_usd)}</span> · Short{' '}
              <span className="font-medium text-ink">{fmtUsd(perps.short_open_interest_usd)}</span>
            </span>
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
            <span className="num text-ink-2">
              Crypto <span className="font-medium text-ink">{fmtUsd(perps.crypto_volume_24h_usd)}</span> · TradFi{' '}
              <span className="font-medium text-ink">{fmtUsd(perps.tradfi_volume_24h_usd)}</span>
            </span>
          ) : (
            <span className="text-ink-2">Engine still building 24-hour fill window</span>
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
            <span className="num text-ink-2">
              Maker equity <span className="font-medium text-ink">{fmtUsd(perps.maker_equity_usd)}</span>
            </span>
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
            <span className="num text-ink-2">
              Margin required <span className="font-medium text-ink">{fmtUsd(perps.maker_requirement_usd)}</span>
            </span>
          }
          note={`${fmtNum(perps.accounts)} accounts · On-chain vault balance unavailable`}
        />
      )}
      <HeadlineMetric
        label="Fees collected"
        value={fmtUsd(perps.fees_collected_usd)}
        definition={perpsDefinitions.insuranceAndFees}
        comparison={
          <span className="num text-ink-2">
            Insurance fund <span className="font-medium text-ink">{fmtUsd(perps.insurance_fund_usd)}</span>
          </span>
        }
        note={feeNote}
      />
    </StatStrip>
  )
}
