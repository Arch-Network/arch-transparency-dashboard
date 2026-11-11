import type { Bridges, Lend, Overview, Series, Snapshot } from '../src/data/snapshot.js'
import { INTEREST_AS_CREDITED_REVISION, type AnalyticsData, type ChartRow } from './analytics.js'
import { buildChain, buildTokens } from './chain.js'
import type { Config } from './config.js'
import type { ExplorerData } from './explorer.js'
import { legacyTvl } from './legacyTvl.js'
import { buildLend, type SymbolOf } from './lend.js'
import { buildPools, buildVaults } from './products.js'
import { dayAxis, dayOf, flowByDay, num, runningTotal, sum } from './series.js'
import { protocolTvl, type TvlReadings } from './tvl.js'

// Pure mapping from the upstream payloads to the dashboard's contract.
// No I/O here, so a fixture can pin every derived figure
// (`scripts/check-snapshot.ts`).

export function assemble(
  a: AnalyticsData,
  e: ExplorerData | null,
  bridges: Bridges | null,
  cfg: Config,
  now: Date,
): Snapshot {
  const symbolOf: SymbolOf = (mint) => e?.tokens[mint]?.symbol || `${mint.slice(0, 4)}…${mint.slice(-4)}`
  const today = dayOf(now.toISOString())
  const lend = buildLend(a, symbolOf, today, cfg)
  const axis = dayAxis(firstDay(a) ?? today, today)
  const tvl = a.legacyTvl ? legacyTvl(a, a.legacyTvl, lend.markets, axis) : protocolTvl(a, axis)
  const series = buildSeries(a, e, axis, tvl)
  return {
    meta: {
      as_of: now.toISOString(),
      refresh_seconds: cfg.refreshSeconds,
      network: cfg.network,
      analytics_version: `${a.version.version}+${a.version.commit}`,
      data_revision: a.version.data_revision,
      degraded: [...(e ? [] : ['explorer']), ...(cfg.archRpcUrl && !bridges ? ['bridges'] : [])],
      analytics_synced_at: a.sync.checkpoints.map((c) => c.updated_at).sort()[0] ?? null,
      analytics_replaying: a.sync.replays.length > 0,
      explorer_indexed_at: e?.stats.latest_indexed_block_timestamp ?? null,
      analytics_api_url: cfg.analyticsBaseUrl,
      history_start: cfg.historyStart,
      explorer_url: cfg.explorerSiteUrl,
    },
    overview: buildOverview(a, series, tvl, lend),
    series,
    lend,
    pools: buildPools(a, symbolOf),
    vaults: buildVaults(a, symbolOf),
    chain: e && buildChain(e, cfg),
    tokens: e && buildTokens(e, cfg, today),
    bridges,
  }
}

/** The day the earliest protocol series opens. */
function firstDay(a: AnalyticsData): string | undefined {
  return [a.tvlDaily, a.volumeDaily, a.feesDaily, a.interestDaily]
    .flatMap((rows) => (rows[0] ? [dayOf(rows[0].t)] : []))
    .sort()[0]
}

/** Whether this analytics build serves PropAMM fills beside pool swaps. */
const servesPropAmm = (rows: ChartRow[]): boolean => rows.some((row) => 'propamm_volume_usd' in row)

const interestIsCredited = (a: AnalyticsData): boolean => a.version.data_revision >= INTEREST_AS_CREDITED_REVISION

function buildSeries(a: AnalyticsData, e: ExplorerData | null, axis: string[], tvl: TvlReadings): Series {
  const pool = flowByDay(a.volumeDaily, 'volume_usd', axis)
  const propamm = servesPropAmm(a.volumeDaily) ? flowByDay(a.volumeDaily, 'propamm_volume_usd', axis) : null
  const volumeCum = runningTotal(pool.map((v, i) => v + (propamm?.[i] ?? 0)))
  const fees = flowByDay(a.feesDaily, 'swap_fees_usd', axis)

  // Credited interest is exact through the last operation, the open day
  // included. The estimate counts the open day at a full day's accrual, so
  // only closed days of it are published.
  const interestDays = interestIsCredited(a) ? axis : axis.slice(0, -1)
  const interest = flowByDay(a.interestDaily, 'lend_supplier_interest_usd', interestDays)
  const interestCum = runningTotal(interest)

  // The explorer's window opens before genesis; drop the empty lead-in.
  const firstTx = e ? e.txVolume.findIndex((d) => d.count > 0) : -1

  return {
    tvl_daily: axis.map((date, i) => ({ date, swap_usd: tvl.swap[i], lend_usd: tvl.lend[i], vault_usd: tvl.vault[i] })),
    volume_daily: axis.map((date, i) => ({
      date,
      pool_usd: pool[i],
      propamm_usd: propamm && propamm[i],
      cumulative_usd: volumeCum[i],
    })),
    fees_daily: axis.map((date, i) => ({ date, swap_fees_usd: fees[i] })),
    interest_daily: interestDays.map((date, i) => ({ date, interest_usd: interest[i], cumulative_usd: interestCum[i] })),
    tx_daily: e && e.txVolume.slice(Math.max(firstTx, 0)).map((d) => ({ date: dayOf(d.date), tx_count: d.count })),
  }
}

function buildOverview(a: AnalyticsData, series: Series, tvl: TvlReadings, lend: Lend): Overview {
  const fees = series.fees_daily.map((r) => r.swap_fees_usd)
  const interest = series.interest_daily.map((r) => r.interest_usd)
  const poolCum = sum(series.volume_daily.map((r) => r.pool_usd))
  const propamm = servesPropAmm(a.volumeDaily) && servesPropAmm(a.volumeLastDay)
  const propammCum = propamm ? sum(series.volume_daily.map((r) => r.propamm_usd ?? 0)) : null
  // A window's pool swaps, and its PropAMM fills where the build serves them.
  const pools = (rows: ChartRow[]) => sum(rows.map((r) => num(r.volume_usd)))
  const fills = (rows: ChartRow[]) => (propamm ? sum(rows.map((r) => num(r.propamm_volume_usd))) : null)
  const pool24h = pools(a.volumeLastDay)
  const propamm24h = fills(a.volumeLastDay)
  const swap = tvl.swap.at(-1) ?? 0
  const lendLiquidity = tvl.lend.at(-1) ?? 0
  const vault = tvl.vault.at(-1) ?? 0
  return {
    tvl_usd: swap + lendLiquidity + vault,
    tvl_change_24h_pct: tvl.change24h?.pct ?? null,
    tvl_change_24h_usd: tvl.change24h?.usd ?? null,
    tvl_components: [
      { id: 'lend', usd: lendLiquidity, change_24h_pct: tvl.change24h?.lendPct ?? null },
      { id: 'vault', usd: vault, change_24h_pct: tvl.change24h?.vaultPct ?? null },
      { id: 'swap', usd: swap, change_24h_pct: tvl.change24h?.swapPct ?? null },
    ],
    tvl_method: a.legacyTvl ? 'rebuilt' : 'protocol',
    tvl_left_out: a.legacyTvl
      ? []
      : lend.markets
          .filter((m) => m.supplied > m.borrowed && (m.price === null || m.price.source === 'oracle'))
          .map((m) => ({ symbol: m.symbol, available_usd: m.available_usd })),
    volume_cum_usd: poolCum + (propammCum ?? 0),
    volume_24h_usd: pool24h + (propamm24h ?? 0),
    volume_prev_24h_usd: pools(a.volumePrevDay) + (fills(a.volumePrevDay) ?? 0),
    pool_volume_cum_usd: poolCum,
    pool_volume_24h_usd: pool24h,
    pool_swaps_24h: sum(a.pools.map((p) => p.swaps_24h ?? 0)),
    propamm_volume_cum_usd: propammCum,
    propamm_volume_24h_usd: propamm24h,
    swap_fees_cum_usd: sum(fees),
    swap_fees_30d_usd: sum(fees.slice(-30)),
    swap_fees_24h_usd: sum(a.pools.map((p) => num(p.fees_24h_usd))),
    lender_interest_method: interestIsCredited(a) ? 'credited' : 'estimated',
    lender_interest_cum_usd: sum(interest),
    lender_interest_7d_usd: sum(interest.slice(-7)),
  }
}
