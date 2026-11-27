import type { Snapshot } from '../../data/snapshot'
import HeadlineMetric, { Delta, Sparkline } from '../../components/HeadlineMetric'
import { MetricsBar, StatStrip, type MetricBarItem } from '../../components/ui'
import { definitions, liveDefinitions } from '../../lib/definitions'
import { fmtNum, fmtPct, fmtToken, fmtUsd } from '../../lib/format'
import { perpsDefinitions } from '../../lib/perpsDefinitions'
import { usePageHref } from '../../lib/range'
import { theyaDefinitions } from '../../lib/theyaDefinitions'

/**
 * 9031wyb82-inspired Overview lead:
 * 1) Four crisp bordered KPI cards (TVL + sparkline, Cumulative Volume, Swap Fees, Lender Interest)
 * 2) Dense single-row horizontal MetricsBar surfacing Theya BTC, Perps, Lending & Chain stats.
 */
export default function Summary({ data }: { data: Snapshot }) {
  const { overview, series, lend, chain, tokens, perps, theya } = data
  const live = liveDefinitions(data)
  const href = usePageHref()
  const book = lend.loan_book
  const withPropAmm = overview.propamm_volume_cum_usd !== null
  const credited = overview.lender_interest_method === 'credited'
  const tvlTotals = series.tvl_daily.map((r) => r.swap_usd + r.lend_usd + r.vault_usd)
  const busiest = [...lend.markets].sort((a, b) => (b.borrowed_usd ?? 0) - (a.borrowed_usd ?? 0))[0]

  const stripItems: MetricBarItem[] = [
    ...(theya && theya.btc !== null
      ? [
          {
            label: 'Theya Tracked BTC',
            value: `${theya.btc.toLocaleString('en-US', { maximumFractionDigits: 2 })} BTC`,
            sub: theya.usd !== null ? fmtUsd(theya.usd) : undefined,
            definition: theyaDefinitions.theyaHoldings,
            href: href('overview', 'theya'),
          },
        ]
      : []),
    ...(perps
      ? [
          {
            label: 'Perps 24h Volume',
            value: perps.volume_24h_usd !== null ? fmtUsd(perps.volume_24h_usd) : '—',
            sub: `OI ${fmtUsd(perps.gross_open_interest_usd)}`,
            definition: perpsDefinitions.volume,
            href: href('perps'),
          },
        ]
      : []),
    {
      label: 'Debt Outstanding',
      value: fmtUsd(lend.borrowed_usd),
      sub: `${fmtPct(lend.utilization_pct)} utilization`,
      definition: definitions.debt,
    },
    book
      ? {
          label: 'Accounts in Debt',
          value: fmtNum(book.accounts),
          sub: `${fmtNum(book.wallets)} wallets`,
          definition: live.borrowers,
        }
      : {
          label: 'Borrowing Accounts (all-time)',
          value: fmtNum(lend.borrowers),
          definition: live.borrowers,
        },
    ...(busiest
      ? [
          {
            label: `${busiest.symbol} Supply / Borrow APR`,
            value: `${fmtPct(busiest.supply_apr_pct, 2)} / ${fmtPct(busiest.borrow_apr_pct, 2)}`,
          },
        ]
      : []),
    ...(tokens ? [{ label: 'BTC on Arch', value: fmtToken(tokens.abtc_supply, 'aBTC') }] : []),
    ...(chain
      ? [
          { label: 'Transactions (24h)', value: fmtNum(chain.tx_24h) },
          ...(chain.avg_block_time_ms !== null
            ? [{ label: 'Avg Block Time', value: `${Math.round(chain.avg_block_time_ms)} ms`, definition: definitions.blockTime }]
            : []),
          { label: 'Validators', value: String(chain.validators_active) },
        ]
      : []),
  ]

  return (
    <div className="space-y-3.5">
      <StatStrip columns={4}>
        <HeadlineMetric
          label="Total Value Locked"
          value={fmtUsd(overview.tvl_usd)}
          definition={live.tvl}
          comparison={
            <span className="flex items-center gap-2.5">
              {overview.tvl_change_24h_pct !== null && <Delta pct={overview.tvl_change_24h_pct} suffix="24h" />}
              <Sparkline values={tvlTotals} />
            </span>
          }
        />
        <HeadlineMetric
          label={withPropAmm ? 'Trading Volume (cumulative)' : 'Swap Volume (cumulative)'}
          value={fmtUsd(overview.volume_cum_usd)}
          definition={live.volume}
          note={
            <>
              <span className="block">{fmtUsd(overview.volume_24h_usd)} in the last 24h</span>
              {overview.propamm_volume_cum_usd !== null && (
                <span className="block">
                  Pools {fmtUsd(overview.pool_volume_cum_usd)} · PropAMM {fmtUsd(overview.propamm_volume_cum_usd)}
                </span>
              )}
            </>
          }
        />
        <HeadlineMetric
          label="Swap Fees (cumulative)"
          value={fmtUsd(overview.swap_fees_cum_usd)}
          definition={definitions.swapFees}
          note={`${fmtUsd(overview.swap_fees_24h_usd)} in the last 24h`}
        />
        <HeadlineMetric
          label="Interest Earned by Lenders"
          value={fmtUsd(overview.lender_interest_cum_usd)}
          definition={live.lenderInterest}
          note={`${fmtUsd(overview.lender_interest_7d_usd)} ${credited ? 'credited in the last 7 days' : 'in the last 7 days, estimated'}`}
        />
      </StatStrip>

      <MetricsBar items={stripItems} />
    </div>
  )
}
