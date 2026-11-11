import type { Lend, Market, MarketPrice, OracleReading, RatesDaily } from '../src/data/snapshot.js'
import type { AnalyticsData, BankSeries, ChartRow, RawMarket } from './analytics.js'
import { emodePairings } from './emode.js'
import { summarizeLoanBook } from './loanBook.js'
import { dayApart, dayAxis, dayOf, heldSum, levelByDay, num, numOrNull, pctChange, readingByDay, sum } from './series.js'

// Arch Lend: the markets as the program holds them, and their totals.

export type SymbolOf = (mint: string) => string

export function buildLend(a: AnalyticsData, symbolOf: SymbolOf, today: string): Lend {
  const shareMints = new Set(a.vaults.map((v) => v.share_mint))
  const markets = a.markets
    .map((m) =>
      toMarket(m, symbolOf(m.mint), shareMints.has(m.mint), a.oracleHourly[m.address], a.bankSeries[m.address], today),
    )
    .sort((x, y) => (y.supplied_usd ?? -1) - (x.supplied_usd ?? -1))
  const supplied = sum(markets.map((m) => m.supplied_usd ?? 0))
  const borrowed = sum(markets.map((m) => m.borrowed_usd ?? 0))
  const l = a.lending
  return {
    supplied_usd: supplied,
    borrowed_usd: borrowed,
    borrowed_change_24h_pct: borrowedChange24hPct(a),
    available_usd: sum(markets.map((m) => m.available_usd ?? 0)),
    utilization_pct: supplied > 0 ? (borrowed / supplied) * 100 : 0,
    net_deposits_24h_usd: sum(markets.map((m) => m.net_deposits_24h_usd ?? 0)),
    net_borrowed_24h_usd: sum(markets.map((m) => m.net_borrowed_24h_usd ?? 0)),
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

/** Debt across the banks that owe any now: the current hour's average
 * against the same hour a day earlier. */
function borrowedChange24hPct(a: AnalyticsData): number | null {
  const pair = dayApart(heldSum(Object.values(a.borrowedHourly), 'v'))
  return pair && pctChange(pair.then.usd, pair.now.usd)
}

/** Analytics names a feed `const`, `coinbase`, `vault:<address>` or `pool:<address>`. */
function referenceSource(source: string | null): MarketPrice['source'] {
  const kind = source?.split(':')[0]
  if (kind === 'const') return 'fixed'
  return kind === 'coinbase' || kind === 'vault' || kind === 'pool' ? kind : 'reference'
}

/** The bank's own oracle at its latest hourly reading, where it was read. */
function oracleReading(oracleHourly: ChartRow[] | undefined): OracleReading | null {
  const latest = oracleHourly?.findLast((row) => row.v != null)
  return latest ? { usd: Number(latest.v), as_of: latest.t } : null
}

/** The analytics reference price where the mint has one; otherwise the bank's
 * own oracle. */
function priceOf(m: RawMarket, oracle: OracleReading | null): MarketPrice | null {
  const { price } = m.state
  if (price.usd !== null) return { usd: Number(price.usd), source: referenceSource(price.source), as_of: price.as_of }
  return oracle && { usd: oracle.usd, source: 'oracle', as_of: oracle.as_of }
}

function toMarket(
  m: RawMarket,
  symbol: string,
  vaultShares: boolean,
  oracleHourly: ChartRow[] | undefined,
  series: BankSeries | undefined,
  today: string,
): Market {
  const { config, state, activity_24h: flows } = m
  const rate = config.interest_rate
  const oracle = oracleReading(oracleHourly)
  const price = priceOf(m, oracle)
  // Analytics' own totals where it prices the mint; units at the oracle price elsewhere.
  const usd = (units: string, referenceUsd: string | null) =>
    price === null ? null : price.source === 'oracle' ? Number(units) * price.usd : numOrNull(referenceUsd)
  // Analytics values a flow only where it has a reference price for the mint.
  const net = (inUsd: string | null, outUsd: string | null) =>
    state.price.usd === null ? null : num(inUsd) - num(outUsd)
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
    oracle_max_age_s: config.oracle.max_age,
    oracle_reading: oracle,
    liquidity_account: m.liquidity_vault,
    net_deposits_24h_usd: net(flows.deposit_usd, flows.withdraw_usd),
    net_borrowed_24h_usd: net(flows.borrow_usd, flows.repay_usd),
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
