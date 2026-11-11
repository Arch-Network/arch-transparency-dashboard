import type { Snapshot } from '../../data/snapshot'
import HeadlineMetric, { Delta } from '../../components/HeadlineMetric'
import { definitions, liveDefinitions } from '../../lib/definitions'
import { fmtNum, fmtPct, fmtUsd, fmtUsdChange } from '../../lib/format'

/** The four figures the page leads with, each with what it compares to and its one qualification. */
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
    <section className="grid grid-cols-2 gap-x-6 gap-y-6 border-y border-line py-5 lg:grid-cols-4">
      <HeadlineMetric
        label="Total value locked"
        value={fmtUsd(overview.tvl_usd)}
        definition={live.tvl}
        comparison={
          overview.tvl_change_24h_pct !== null &&
          overview.tvl_change_24h_usd !== null && (
            <>
              <Delta pct={overview.tvl_change_24h_pct} /> {fmtUsdChange(overview.tvl_change_24h_usd)} vs 24 hours ago
            </>
          )
        }
        note={
          'Each asset counted once. Excludes PropAMM inventory' +
          (leftOutUsd > 0 ? ` and ${fmtUsd(leftOutUsd)} of deposits with no reference price.` : '.')
        }
      />
      <HeadlineMetric
        label={withPropAmm ? 'Trading volume, last 24 hours' : 'Pool swap volume, last 24 hours'}
        value={fmtUsd(overview.volume_24h_usd)}
        definition={live.volume}
        comparison={
          volumeChangePct !== null && (
            <>
              <Delta pct={volumeChangePct} /> vs the 24 hours before
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
              <Delta pct={lend.borrowed_change_24h_pct} neutral /> vs 24 hours ago
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
            : 'Have ever borrowed, repaid or not.'
        }
      />
    </section>
  )
}
