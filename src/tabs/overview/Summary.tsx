import type { Snapshot } from '../../data/snapshot'
import HeadlineMetric, { Delta } from '../../components/HeadlineMetric'
import { StatStrip } from '../../components/ui'
import { definitions, liveDefinitions } from '../../lib/definitions'
import { fmtNum, fmtPct, fmtUsd, fmtUsdChange } from '../../lib/format'

/** The four figures the page leads with, in an Arch Prime KPI strip card. */
export default function Summary({ data }: { data: Snapshot }) {
  const { overview, lend } = data
  const live = liveDefinitions(data)
  const book = lend.loan_book
  const withPropAmm = overview.propamm_volume_24h_usd !== null
  const leftOutUsd = overview.tvl_left_out.reduce((total, m) => total + (m.available_usd ?? 0), 0)
  const volumeChangePct =
    overview.volume_prev_24h_usd > 0
      ? (overview.volume_24h_usd / overview.volume_prev_24h_usd - 1) * 100
      : null
  const swaps = `${fmtNum(overview.pool_swaps_24h)} pool swaps`

  return (
    <StatStrip columns={4}>
      <HeadlineMetric
        label="Total value locked"
        value={fmtUsd(overview.tvl_usd)}
        definition={live.tvl}
        comparison={
          overview.tvl_change_24h_pct !== null &&
          overview.tvl_change_24h_usd !== null && (
            <>
              <Delta pct={overview.tvl_change_24h_pct} />
              <span className="num text-ink-2">{fmtUsdChange(overview.tvl_change_24h_usd)} · 24h</span>
            </>
          )
        }
        note={
          'Each asset counted once. Excludes the PropAMM maker’s own inventory' +
          (leftOutUsd > 0 ? ` and ${fmtUsd(leftOutUsd)} of deposits with no reference price.` : '.')
        }
      />
      <HeadlineMetric
        label={withPropAmm ? 'Trading volume, 24 h' : 'Pool swap volume, 24 h'}
        value={fmtUsd(overview.volume_24h_usd)}
        definition={live.volume}
        comparison={
          volumeChangePct !== null && (
            <>
              <Delta pct={volumeChangePct} />
              <span className="text-ink-2">vs prior 24h</span>
            </>
          )
        }
        note={
          overview.propamm_volume_24h_usd !== null
            ? `Pools ${fmtUsd(overview.pool_volume_24h_usd)} · PropAMM ${fmtUsd(overview.propamm_volume_24h_usd)} · ${swaps}`
            : `${swaps} · PropAMM fills not included`
        }
      />
      <HeadlineMetric
        label="Debt outstanding"
        value={fmtUsd(lend.borrowed_usd)}
        definition={definitions.debt}
        comparison={
          lend.borrowed_change_24h_pct !== null && (
            <>
              <Delta pct={lend.borrowed_change_24h_pct} neutral />
              <span className="text-ink-2">vs 24h ago</span>
            </>
          )
        }
        note={`${fmtPct(lend.utilization_pct)} of ${fmtUsd(lend.supplied_usd)} supplied to Arch Lend`}
      />
      <HeadlineMetric
        label={book ? 'Accounts in debt' : 'Borrowing accounts, all-time'}
        value={fmtNum(book ? book.accounts : lend.borrowers)}
        definition={live.borrowers}
        note={
          book
            ? `Owned by ${fmtNum(book.wallets)} wallets. ${fmtNum(lend.borrowers)} accounts have ever borrowed.`
            : 'Have ever borrowed, repaid or not'
        }
      />
    </StatStrip>
  )
}
