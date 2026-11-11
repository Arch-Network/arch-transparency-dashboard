import type { Market } from '../src/data/snapshot.js'
import type { AnalyticsData, BankChart, ChartRow, RawMarket } from './analytics.js'
import { levelByDay, num, sum } from './series.js'
import { change24hPct, TVL_COLUMNS, type TvlReadings } from './tvl.js'

// Locked value for an analytics build below TVL_COUNTS_ONCE_REVISION, whose
// `lend_available_usd` sums every bank, the vault-share banks included, and so
// counts a vault's assets twice. The lending component is rebuilt here from
// the banks that are not vault-share banks. Delete this file, and the branch
// in `assemble.ts` that calls it, once every deployment serves that revision.

/** A bank's un-borrowed liquidity per day. Analytics values it in USD where
 * it has a reference price for the mint; elsewhere it serves the units, and
 * the price is the bank's own oracle. */
type BankLiquidity = { priced: true; usd: ChartRow[] } | { priced: false; units: ChartRow[]; oracleDaily: ChartRow[] }

export interface LegacyTvlData {
  /** The banks holding assets that are not vault shares. */
  liquidity: BankLiquidity[]
  /** Hourly un-borrowed USD of each vault-share bank, over the hourly TVL window. */
  shareBankHourly: ChartRow[][]
}

export async function fetchLegacyTvl(
  chart: BankChart,
  holding: RawMarket[],
  shareMints: Set<string>,
): Promise<LegacyTvlData> {
  const liquid = holding.filter((m) => !shareMints.has(m.mint))
  const shareBanks = holding.filter((m) => shareMints.has(m.mint))
  const [liquidity, shareBankHourly] = await Promise.all([
    Promise.all(liquid.map((m) => fetchBankLiquidity(chart, m))),
    Promise.all(shareBanks.map((m) => chart(m.address, 'available', '1h'))),
  ])
  return { liquidity, shareBankHourly }
}

async function fetchBankLiquidity(chart: BankChart, m: RawMarket): Promise<BankLiquidity> {
  if (m.state.price.usd !== null) return { priced: true, usd: await chart(m.address, 'available', '1d') }
  const [units, oracleDaily] = await Promise.all([
    chart(m.address, 'available_units', '1d'),
    chart(m.address, 'price', '1d'),
  ])
  return { priced: false, units, oracleDaily }
}

/** Swap and vault values are each day's close; lending liquidity is the day's
 * time-weighted average. The open day is the present reading: pool, bank and
 * vault state now, each asset once. */
export function legacyTvl(a: AnalyticsData, legacy: LegacyTvlData, markets: Market[], axis: string[]): TvlReadings {
  const swap = levelByDay(a.tvlDaily, 'swap_liquidity_usd', axis)
  const vault = levelByDay(a.tvlDaily, 'vault_assets_usd', axis)
  const lend = lendLiquidityByDay(legacy, axis)
  const open = axis.length - 1
  swap[open] = sum(a.pools.map((p) => num(p.tvl_usd)))
  lend[open] = sum(markets.filter((m) => !m.vault_shares).map((m) => m.available_usd ?? 0))
  vault[open] = sum(a.vaults.map((v) => num(v.tvl_usd)))
  return { swap, lend, vault, change24hPct: change24hPct(hourlyTvl(a, legacy)) }
}

function lendLiquidityByDay(legacy: LegacyTvlData, axis: string[]): number[] {
  const perBank = legacy.liquidity.map((l) => {
    if (l.priced) return levelByDay(l.usd, 'v', axis)
    const units = levelByDay(l.units, 'v', axis)
    const price = levelByDay(l.oracleDaily, 'v', axis)
    return axis.map((_, i) => units[i] * price[i])
  })
  return axis.map((_, i) => sum(perBank.map((days) => days[i])))
}

/** Analytics' hourly total less the vault-share banks' liquidity in the same
 * hour, every stream held forward over a missing reading. Banks priced by
 * their oracle are in neither reading. */
function hourlyTvl(a: AnalyticsData, legacy: LegacyTvlData): { t: number; usd: number }[] {
  const total = [0, 0, 0]
  const shareBanks = legacy.shareBankHourly.map((rows) => new Map(rows.map((r) => [Date.parse(r.t), r.v])))
  const shares = shareBanks.map(() => 0)
  return a.tvlHourly.map((row) => {
    const t = Date.parse(row.t)
    TVL_COLUMNS.forEach((column, i) => {
      const v = row[column]
      if (v != null) total[i] = Number(v)
    })
    shareBanks.forEach((byHour, i) => {
      const v = byHour.get(t)
      if (v != null) shares[i] = Number(v)
    })
    return { t, usd: sum(total) - sum(shares) }
  })
}
