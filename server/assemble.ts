import type {
  Chain,
  Lend,
  Market,
  MarketPrice,
  Overview,
  RatesDaily,
  Series,
  Snapshot,
  Tokens,
} from '../src/data/snapshot.js'
import {
  INTEREST_AS_CREDITED_REVISION,
  type AnalyticsData,
  type BankSeries,
  type ChartRow,
  type RawMarket,
} from './analytics.js'
import type { Config } from './config.js'
import { emodePairings } from './emode.js'
import type { ExplorerData, RawToken } from './explorer.js'
import { legacyTvl } from './legacyTvl.js'
import { summarizeLoanBook } from './loanBook.js'
import { dayAxis, dayOf, flowByDay, levelByDay, num, numOrNull, readingByDay, runningTotal, sum } from './series.js'
import { protocolTvl, type TvlReadings } from './tvl.js'

// Pure mapping from the two upstream payloads to the dashboard's contract.
// No I/O here, so a fixture can pin every derived figure.

const DAY_MS = 86_400_000

type SymbolOf = (mint: string) => string

export function assemble(a: AnalyticsData, e: ExplorerData | null, cfg: Config, now: Date): Snapshot {
  const symbolOf: SymbolOf = (mint) => e?.tokens[mint]?.symbol || `${mint.slice(0, 4)}…${mint.slice(-4)}`
  const today = dayOf(now.toISOString())
  const lend = buildLend(a, symbolOf, today)
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
      degraded: e ? [] : ['explorer'],
      analytics_synced_at: a.sync.checkpoints.map((c) => c.updated_at).sort()[0] ?? null,
      analytics_replaying: a.sync.replays.length > 0,
      explorer_indexed_at: e?.stats.latest_indexed_block_timestamp ?? null,
    },
    overview: buildOverview(a, series, tvl, lend),
    series,
    lend,
    pools: a.pools.map((p) => ({
      address: p.address,
      pair: `${symbolOf(p.mint_a)}/${symbolOf(p.mint_b)}`,
      tvl_usd: num(p.tvl_usd),
      volume_24h_usd: num(p.volume_24h_usd),
      fees_24h_usd: num(p.fees_24h_usd),
    })),
    chain: e && buildChain(e),
    tokens: e && buildTokens(e, cfg, today),
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
  const pool24h = sum(a.volumeLastDay.map((r) => num(r.volume_usd)))
  const propamm = servesPropAmm(a.volumeDaily) && servesPropAmm(a.volumeLastDay)
  const propammCum = propamm ? sum(series.volume_daily.map((r) => r.propamm_usd ?? 0)) : null
  const propamm24h = propamm ? sum(a.volumeLastDay.map((r) => num(r.propamm_volume_usd))) : null
  return {
    tvl_usd: (tvl.swap.at(-1) ?? 0) + (tvl.lend.at(-1) ?? 0) + (tvl.vault.at(-1) ?? 0),
    tvl_change_24h_pct: tvl.change24hPct,
    tvl_method: a.legacyTvl ? 'rebuilt' : 'protocol',
    tvl_left_out: a.legacyTvl
      ? []
      : lend.markets
          .filter((m) => m.supplied > m.borrowed && (m.price === null || m.price.source === 'oracle'))
          .map((m) => ({ symbol: m.symbol, available_usd: m.available_usd })),
    volume_cum_usd: poolCum + (propammCum ?? 0),
    volume_24h_usd: pool24h + (propamm24h ?? 0),
    pool_volume_cum_usd: poolCum,
    pool_volume_24h_usd: pool24h,
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

function buildLend(a: AnalyticsData, symbolOf: SymbolOf, today: string): Lend {
  const shareMints = new Set(a.vaults.map((v) => v.share_mint))
  const markets = a.markets
    .map((m) =>
      toMarket(m, symbolOf(m.mint), shareMints.has(m.mint), priceOf(m, a.oracleHourly[m.address]), a.bankSeries[m.address], today),
    )
    .sort((x, y) => (y.supplied_usd ?? -1) - (x.supplied_usd ?? -1))
  const supplied = sum(markets.map((m) => m.supplied_usd ?? 0))
  const borrowed = sum(markets.map((m) => m.borrowed_usd ?? 0))
  const l = a.lending
  return {
    supplied_usd: supplied,
    borrowed_usd: borrowed,
    available_usd: sum(markets.map((m) => m.available_usd ?? 0)),
    utilization_pct: supplied > 0 ? (borrowed / supplied) * 100 : 0,
    loan_book: a.loanBook && summarizeLoanBook(a.loanBook),
    emode_pairings: emodePairings(a.markets, markets),
    borrow_events: l.borrow_events,
    borrowers: l.borrowers,
    borrow_volume_usd: num(l.borrow_volume_usd),
    liquidation_events: l.liquidation_events,
    liquidation_seized_usd: num(l.liquidation_seized_usd),
    liquidation_repaid_usd: num(l.liquidation_repaid_usd),
    bankruptcy_events: l.bankruptcy_events,
    bad_debt_usd: num(l.bad_debt_usd),
    markets,
  }
}

/** Analytics names a feed `const`, `coinbase`, `vault:<address>` or `pool:<address>`. */
function referenceSource(source: string | null): MarketPrice['source'] {
  const kind = source?.split(':')[0]
  if (kind === 'const') return 'fixed'
  return kind === 'coinbase' || kind === 'vault' || kind === 'pool' ? kind : 'reference'
}

/** The analytics reference price where the mint has one; otherwise the bank's
 * own oracle at its latest hourly reading. */
function priceOf(m: RawMarket, oracleHourly: ChartRow[] | undefined): MarketPrice | null {
  const { price } = m.state
  if (price.usd !== null) return { usd: Number(price.usd), source: referenceSource(price.source), as_of: price.as_of }
  const latest = oracleHourly?.findLast((row) => row.v != null)
  return latest ? { usd: Number(latest.v), source: 'oracle', as_of: latest.t } : null
}

function toMarket(
  m: RawMarket,
  symbol: string,
  vaultShares: boolean,
  price: MarketPrice | null,
  series: BankSeries | undefined,
  today: string,
): Market {
  const { config, state } = m
  const rate = config.interest_rate
  // Analytics' own totals where it prices the mint; units at the oracle price elsewhere.
  const usd = (units: string, referenceUsd: string | null) =>
    price === null ? null : price.source === 'oracle' ? Number(units) * price.usd : numOrNull(referenceUsd)
  return {
    address: m.address,
    mint: m.mint,
    symbol,
    vault_shares: vaultShares,
    supplied: Number(state.total_assets),
    borrowed: Number(state.total_liabilities),
    price,
    supplied_usd: usd(state.total_assets, state.total_assets_usd),
    borrowed_usd: usd(state.total_liabilities, state.total_liabilities_usd),
    available_usd: usd(state.available, state.available_usd),
    utilization_pct: state.utilization * 100,
    supply_apr_pct: state.lending_rate_apr * 100,
    borrow_apr_pct: state.borrowing_rate_apr * 100,
    asset_weight_init: config.asset_weight_init,
    asset_weight_maint: config.asset_weight_maint,
    liability_weight_init: config.liability_weight_init,
    liability_weight_maint: config.liability_weight_maint,
    optimal_utilization_pct: rate.optimal_utilization_rate * 100,
    plateau_rate_pct: rate.plateau_interest_rate * 100,
    max_rate_pct: rate.max_interest_rate * 100,
    liquidation_fee_pct: config.liquidation_fee * 100,
    operational_state: config.operational_state,
    risk_tier: config.risk_tier,
    oracle: config.oracle.setup,
    // The API serves a null limit when the program sets none.
    borrowable: config.borrow_limit === null || Number(config.borrow_limit) > 0,
    rates_daily: series ? ratesDaily(series, today) : [],
    curve: (series?.curve ?? []).map((p) => ({
      utilization_pct: p.utilization * 100,
      borrow_apr_pct: p.borrow_apr * 100,
      supply_apr_pct: p.supply_apr * 100,
    })),
  }
}

function ratesDaily(s: BankSeries, today: string): RatesDaily[] {
  const firstDays = [s.utilization, s.borrowApr, s.supplyApr].flatMap((rows) => (rows[0] ? [dayOf(rows[0].t)] : []))
  const first = firstDays.sort()[0]
  if (!first) return []
  const axis = dayAxis(first, today)
  const utilization = readingByDay(s.utilization, 'v', axis).map((v) => (v === null ? null : v * 100))
  const borrowApr = levelByDay(s.borrowApr, 'v', axis)
  const supplyApr = levelByDay(s.supplyApr, 'v', axis)
  return axis.map((date, i) => ({
    date,
    utilization_pct: utilization[i],
    borrow_apr_pct: borrowApr[i] * 100,
    supply_apr_pct: supplyApr[i] * 100,
  }))
}

function buildChain(e: ExplorerData): Chain {
  return {
    arch_block: e.stats.latest_block_height,
    btc_tip_block: e.btcTip,
    tx_24h: e.stats.tx_24h,
    tx_total: e.stats.total_transactions,
    tps_24h: e.stats.tx_24h / (DAY_MS / 1000),
    tps_peak: e.stats.peak_tps,
    avg_block_time_ms: e.blocks24h > 0 ? DAY_MS / e.blocks24h : null,
    validators_active: e.validatorsActive,
    accounts_total: e.stats.total_accounts,
  }
}

function buildTokens(e: ExplorerData, cfg: Config, today: string): Tokens {
  const units = (t: RawToken) => Number(t.supply) / 10 ** t.decimals
  const abtc = e.tokens[cfg.abtcMint]
  const ausd = e.tokens[cfg.ausdMint]
  // The explorer omits days without a transfer; those days moved nothing.
  const byDay = new Map(e.ausdAnalytics.daily.map((d) => [dayOf(d.day), d]))
  const firstDay = [...byDay.keys()].sort()[0]
  const axis = firstDay ? dayAxis(firstDay, today) : []
  return {
    abtc_mint: cfg.abtcMint,
    ausd_mint: cfg.ausdMint,
    abtc_supply: units(abtc),
    abtc_holders: abtc.holders,
    ausd_supply: units(ausd),
    ausd_holders: ausd.holders,
    ausd_transfers_total: e.ausdAnalytics.total_transfers,
    ausd_transfer_volume_total: e.ausdAnalytics.total_volume_ui,
    ausd_transfers_daily: axis.map((date) => ({
      date,
      transfers: byDay.get(date)?.transfers ?? 0,
      volume: byDay.get(date)?.volume_ui ?? 0,
    })),
  }
}
