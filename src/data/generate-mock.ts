// Deterministic mock data generator (build handoff §4).
// Run: npm run gen  →  writes src/data/mock.json
// Seeded PRNG; internal consistency enforced by assertions at the bottom.

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type {
  MockData,
  TvlDaily,
  VolumeDaily,
  RevenueDaily,
  LpYieldDaily,
  UtilizationDaily,
  BlockspaceDaily,
  Loan,
  Liquidation,
  LtvBucket,
  ArchUsdFlowsDaily,
  ArchUsdNavDaily,
  ArchUsdYieldDaily,
  FlywheelRatiosDaily,
} from '../types.ts'

// ---------------------------------------------------------------- PRNG

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20260701)
const uniform = (lo: number, hi: number) => lo + (hi - lo) * rand()
const normal = () => {
  // Box-Muller
  const u = Math.max(rand(), 1e-12)
  const v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
const round2 = (x: number) => Math.round(x * 100) / 100
const round4 = (x: number) => Math.round(x * 10000) / 10000

// ---------------------------------------------------------------- constants

const DAYS = 30
const START = new Date('2026-06-01T00:00:00Z')
const AS_OF = '2026-07-01T12:00:00Z'
const BTC_PRICE = 84000
const MAX_LTV = 80
const LLTV = 86
const TARGET_UTIL = 90

const dateOf = (i: number) => {
  const d = new Date(START.getTime() + i * 86400000)
  return d.toISOString().slice(0, 10)
}

/** Early-growth curve: exponential climb from `start` to `end` with day noise. */
function growth(start: number, end: number, noise: number): number[] {
  const g = Math.pow(end / start, 1 / (DAYS - 1))
  const out: number[] = []
  for (let i = 0; i < DAYS; i++) {
    const base = start * Math.pow(g, i)
    const wobble = i === DAYS - 1 ? 0 : 1 + normal() * noise // last point lands exactly on `end`
    out.push(Math.max(base * wobble, start * 0.5))
  }
  out[DAYS - 1] = end
  return out
}

// ---------------------------------------------------------------- loans (drive lend-side totals)

const LOAN_COUNT = 214
const loans: Loan[] = []
{
  const chars = '023456789acdefghjklmnpqrstuvwxyz'
  let collateralScale: number[] = []
  for (let i = 0; i < LOAN_COUNT; i++) {
    collateralScale.push(Math.exp(normal() * 1.1)) // lognormal sizes
  }
  const scaleSum = collateralScale.reduce((a, b) => a + b, 0)
  const TOTAL_COLLATERAL_BTC = 402.5
  for (let i = 0; i < LOAN_COUNT; i++) {
    const collateral_btc = round4((collateralScale[i] / scaleSum) * TOTAL_COLLATERAL_BTC)
    // Current LTV: clamped normal centered low — a healthy early book.
    const ltv = Math.min(79.5, Math.max(8, 45 + normal() * 14))
    const debt_usd = Math.round(collateral_btc * BTC_PRICE * (ltv / 100))
    const ltv_pct = round2((debt_usd / (collateral_btc * BTC_PRICE)) * 100)
    const liq_price_usd = Math.round(debt_usd / ((LLTV / 100) * collateral_btc))
    const addr = () => chars[Math.floor(rand() * chars.length)]
    loans.push({
      owner_trunc: `bc1q${addr()}${addr()}${addr()}…${addr()}${addr()}${addr()}${addr()}`,
      collateral_btc,
      debt_usd,
      ltv_pct,
      dist_to_liq_pct: round2(LLTV - ltv_pct),
      liq_price_usd,
    })
  }
}

const totalCollateralBtc = round4(loans.reduce((a, l) => a + l.collateral_btc, 0))
const totalCollateralUsd = Math.round(totalCollateralBtc * BTC_PRICE)
const totalBorrowedUsd = loans.reduce((a, l) => a + l.debt_usd, 0)
const aggregateLtv = round2((totalBorrowedUsd / totalCollateralUsd) * 100)
const UTILIZATION = 71.5
const lendDepositsEnd = Math.round(totalBorrowedUsd / (UTILIZATION / 100))
const availableLiquidity = lendDepositsEnd - totalBorrowedUsd

// ---------------------------------------------------------------- TVL series

const TVL_END = 58600000
const swapEnd = TVL_END - lendDepositsEnd - totalCollateralUsd
// TVL climbs ~6% over the window with an ACCELERATING inflow shape (quadratic
// ease-in): weekly net inflow grows faster than distribution, which is what
// makes the attraction ratio trend up — the wheel visibly turning.
function accel(start: number, end: number, noiseAmp: number): number[] {
  const out: number[] = []
  for (let i = 0; i < DAYS; i++) {
    const f = Math.pow(i / (DAYS - 1), 2)
    const base = start + (end - start) * f
    const wobble = i === DAYS - 1 ? 0 : normal() * noiseAmp * (end - start)
    out.push(base + wobble)
  }
  out[DAYS - 1] = end
  return out
}
const swapSeries = accel(swapEnd * 0.94, swapEnd, 0.012)
const depositSeries = accel(lendDepositsEnd * 0.94, lendDepositsEnd, 0.012)
const collateralSeries = accel(totalCollateralUsd * 0.94, totalCollateralUsd, 0.012)

const tvl_daily: TvlDaily[] = []
for (let i = 0; i < DAYS; i++) {
  tvl_daily.push({
    date: dateOf(i),
    swap_usd: Math.round(swapSeries[i]),
    lend_deposits_usd: Math.round(depositSeries[i]),
    collateral_usd: Math.round(collateralSeries[i]),
  })
}
const tvlOf = (r: TvlDaily) => r.swap_usd + r.lend_deposits_usd + r.collateral_usd
const tvlEnd = tvlOf(tvl_daily[DAYS - 1])
const tvlPrev = tvlOf(tvl_daily[DAYS - 2])

// Utilization path — shared by rates, lending revenue, and the budget wedge.
const utilSeriesShared = growth(58, UTILIZATION, 0.03).map((v) => round2(Math.min(v, 94)))
utilSeriesShared[DAYS - 1] = UTILIZATION

// ---------------------------------------------------------------- volume

const volDaily = growth(1150000, 2400000, 0.12)
const volume_daily: VolumeDaily[] = []
{
  let cum = 0
  for (let i = 0; i < DAYS; i++) {
    const v = Math.round(volDaily[i])
    cum += v
    volume_daily.push({ date: dateOf(i), volume_usd: v, cumulative_usd: cum })
  }
}

// ---------------------------------------------------------------- blockspace

const txDaily = growth(26000, 48200, 0.06)
const blockspace_daily: BlockspaceDaily[] = []
for (let i = 0; i < DAYS; i++) {
  const tx_count = Math.round(txDaily[i])
  const avg_fee_sats = Math.round(uniform(42, 58))
  const fees_btc = round4((tx_count * avg_fee_sats) / 1e8)
  blockspace_daily.push({ date: dateOf(i), tx_count, fees_btc, avg_fee_sats })
}

// ---------------------------------------------------------------- liquidations (before revenue: penalties feed the liquidation stream)

// Launch-day book per the designer reference: no liquidations to date — the
// Risk tab renders its empty state and the liquidation revenue stream is zero.
// Set eventDays to e.g. [7, 13, 21, 26] to preview a populated history.
const liquidations: Liquidation[] = []
{
  const eventDays: number[] = []
  for (const d of eventDays) {
    const collateral_btc = round4(uniform(0.3, 1.1))
    const debt_repaid_usd = Math.round(collateral_btc * BTC_PRICE * (LLTV / 100) * uniform(0.97, 1.0))
    const penalty_usd = Math.round(debt_repaid_usd * uniform(0.015, 0.02))
    const hh = String(Math.floor(uniform(0, 24))).padStart(2, '0')
    const mm = String(Math.floor(uniform(0, 60))).padStart(2, '0')
    liquidations.push({
      ts: `${dateOf(d)}T${hh}:${mm}:00Z`,
      collateral_btc,
      debt_repaid_usd,
      penalty_usd,
      recovery_pct: 100,
    })
  }
}
const penaltiesByDay = new Map<string, number>()
for (const l of liquidations) {
  const day = l.ts.slice(0, 10)
  penaltiesByDay.set(day, (penaltiesByDay.get(day) ?? 0) + l.penalty_usd)
}

// ---------------------------------------------------------------- revenue (five canonical streams)

// ---------------------------------------------------------------- rates (the wedge)
// Under the budget mechanism (Arch Economic Model v0.3), lender APY is held
// ABOVE borrower APR — the wedge — funded by the budget, not by the credit
// market. Rates converge toward the published targets over the window as the
// subsidy ramps in.
const LENDER_APY_TARGET = 7.0
const BORROW_APR_TARGET = 4.5
const supplyApySeries = growth(6.5, LENDER_APY_TARGET, 0.008)
const borrowAprSeries = growth(5.2, BORROW_APR_TARGET, 0.008) // decays toward target

const SWAP_PROTOCOL_FEE = 0.0012 // mock protocol share of trading fees (Open Item 2)
const partnerDaily = growth(1600, 3200, 0.15)
// AM fee revenue — HFT acquisition asset-management business, ~$3M/yr (Matt, 2026-07-03)
const amDaily = growth(6800, 9600, 0.08)
// Protocol keeps a small share of borrow interest; lending is a loss-leader
// under the wedge (spread revenue is small by design — the float and AM fund it).
const LEND_PROTOCOL_SHARE = 0.1

const revenue_daily: RevenueDaily[] = []
for (let i = 0; i < DAYS; i++) {
  const blockspace_usd = Math.round(blockspace_daily[i].fees_btc * BTC_PRICE)
  const swap_usd = Math.round(volume_daily[i].volume_usd * SWAP_PROTOCOL_FEE)
  const borrowedI = depositSeries[i] * (utilSeriesShared[i] / 100)
  const lend_spread_usd = Math.round(((borrowAprSeries[i] / 100) * borrowedI * LEND_PROTOCOL_SHARE) / 365)
  const liquidation_usd = penaltiesByDay.get(dateOf(i)) ?? 0
  const partner_usd = Math.round(partnerDaily[i])
  const am_usd = Math.round(amDaily[i])
  revenue_daily.push({
    date: dateOf(i),
    blockspace_usd,
    swap_usd,
    lend_spread_usd,
    liquidation_usd,
    partner_usd,
    am_usd,
  })
}
const revTotalOf = (r: RevenueDaily) =>
  r.blockspace_usd + r.swap_usd + r.lend_spread_usd + r.liquidation_usd + r.partner_usd + r.am_usd
const totalRevenue = revenue_daily.reduce((a, r) => a + revTotalOf(r), 0)

// ---------------------------------------------------------------- LP yield

// LP distribution grows slightly faster than revenue so the recycle rate
// trends up over the window.
const lpDaily = growth(4400, 11000, 0.08)
const lp_yield_daily: LpYieldDaily[] = []
{
  let cum = 0
  for (let i = 0; i < DAYS; i++) {
    const distributed_usd = Math.round(lpDaily[i])
    const swap_usd = Math.round(distributed_usd * uniform(0.36, 0.44))
    const lend_usd = distributed_usd - swap_usd
    cum += distributed_usd
    lp_yield_daily.push({
      date: dateOf(i),
      distributed_usd,
      cumulative_usd: cum,
      swap_usd,
      lend_usd,
    })
  }
}
const lpCumulative = lp_yield_daily[DAYS - 1].cumulative_usd
const lp7d = lp_yield_daily.slice(-7).reduce((a, r) => a + r.distributed_usd, 0)

// ---------------------------------------------------------------- utilization & rates
// Rates reflect the SUBSIDIZED wedge: lender APY above borrower APR, funded by
// the budget. The IRM curve (Risk tab) remains the pre-subsidy base mechanism.
const utilization_daily: UtilizationDaily[] = []
for (let i = 0; i < DAYS; i++) {
  utilization_daily.push({
    date: dateOf(i),
    utilization_pct: utilSeriesShared[i],
    borrow_apr_pct: round2(borrowAprSeries[i]),
    supply_apy_pct: round2(supplyApySeries[i]),
  })
}
utilization_daily[DAYS - 1].borrow_apr_pct = BORROW_APR_TARGET
utilization_daily[DAYS - 1].supply_apy_pct = LENDER_APY_TARGET

// ---------------------------------------------------------------- assets by category (config-driven; launch: BTC + Stablecoins only)

const assets_by_category = [
  {
    category: 'BTC',
    deposited_usd: totalCollateralUsd + tvl_daily[DAYS - 1].swap_usd / 2, // collateral + BTC side of swap pools
    borrowed_usd: 0,
  },
  {
    category: 'Stablecoins',
    deposited_usd: lendDepositsEnd + tvl_daily[DAYS - 1].swap_usd / 2, // lend deposits + stable side of swap pools
    borrowed_usd: totalBorrowedUsd,
  },
].map((c) => ({ ...c, deposited_usd: Math.round(c.deposited_usd) }))

// ---------------------------------------------------------------- LTV distribution (5-point buckets, 0–86)

const ltv_distribution: LtvBucket[] = []
for (let lo = 0; lo < LLTV; lo += 5) {
  const hi = Math.min(lo + 5, LLTV)
  const inBucket = loans.filter((l) => l.ltv_pct >= lo && l.ltv_pct < hi)
  ltv_distribution.push({
    bucket_min: lo,
    bucket_max: hi,
    loan_count: inBucket.length,
    debt_usd: inBucket.reduce((a, l) => a + l.debt_usd, 0),
  })
}

// ---------------------------------------------------------------- flywheel (30d window; ratios DERIVE from flows)

const netNewCapital = tvlEnd - tvlOf(tvl_daily[0])
const runRate = Math.round(totalRevenue * 12.17)
const flywheelRatios = {
  capital_productivity_pct: round2((runRate / tvlEnd) * 100),
  utilization_pct: UTILIZATION,
  recycle_rate_pct: round2((lpCumulative / totalRevenue) * 100),
  attraction_ratio: round2(netNewCapital / lpCumulative),
  positive_flow_weeks: 0, // computed below
}
{
  // consecutive positive TVL weeks, counted from the most recent week backwards
  let streak = 0
  for (let w = 0; w < 4; w++) {
    const endIdx = DAYS - 1 - w * 7
    const startIdx = endIdx - 7
    if (startIdx < 0) break
    if (tvlOf(tvl_daily[endIdx]) > tvlOf(tvl_daily[startIdx])) streak++
    else break
  }
  flywheelRatios.positive_flow_weeks = streak
}

// Daily ratio sparklines use trailing 7-day windows so recent acceleration
// is visible (cumulative-to-date ratios would smooth the motion away).
const ratios_daily: FlywheelRatiosDaily[] = []
for (let i = 0; i < DAYS; i++) {
  const w0 = Math.max(0, i - 6)
  const win = i - w0 + 1
  const rev7 = revenue_daily.slice(w0, i + 1).reduce((a, r) => a + revTotalOf(r), 0)
  const dist7 = lp_yield_daily.slice(w0, i + 1).reduce((a, r) => a + r.distributed_usd, 0)
  const annualized = (rev7 / win) * 365
  const netNew7 = tvlOf(tvl_daily[i]) - tvlOf(tvl_daily[w0])
  ratios_daily.push({
    date: dateOf(i),
    capital_productivity_pct: round2((annualized / tvlOf(tvl_daily[i])) * 100),
    recycle_rate_pct: round2((dist7 / rev7) * 100),
    attraction_ratio: round2(netNew7 / Math.max(dist7, 1)),
  })
}

// Deltas vs. prior 30d: prior window is pre-series; model it as ~72–86% of current flows.
const deltas_pct = {
  deployed: round2(uniform(14, 22)),
  activity: round2(uniform(18, 28)),
  revenue: round2(uniform(16, 26)),
  distributed: round2(uniform(12, 20)),
  net_new_capital: round2(uniform(10, 24)),
}

const flywheel = {
  window_days: 30,
  flows: {
    deployed_usd: tvlEnd,
    activity_usd: volume_daily[DAYS - 1].cumulative_usd,
    revenue_usd: totalRevenue,
    distributed_usd: lpCumulative,
    net_new_capital_usd: netNewCapital,
    deltas_pct,
  },
  ratios: flywheelRatios,
  ratios_daily,
}

// ---------------------------------------------------------------- ArchUSD

// The float is SEEDED at genesis (the raise buys the float — bootstrap model
// 2026-07-03); user mint/redeem flows layer on top of the seed.
const SEED_FLOAT = 69000000
const USER_NET_TARGET = 6000000 // user flows add this over the window
const SUPPLY_END = SEED_FLOAT + USER_NET_TARGET // 75M — the modeled seed-float scale
const HOLDER_APR = 4.5 // ArchUSD holder yield — the retention defense (budget line 2)
const mintedDaily = growth(430000, 640000, 0.1)
const flows_daily: ArchUsdFlowsDaily[] = []
const nav_daily: ArchUsdNavDaily[] = []
const yield_daily: ArchUsdYieldDaily[] = []
{
  let cumMint = 0
  let cumRedeem = 0
  let supply = 0
  // First pass: raw flows.
  // Retention assumption (Matt, 2026-07-03): the natural path is stables
  // leaving the chain, so redemptions run close to 50/50 against mints.
  // Incentives and cashflow distribution fight to keep the float on-chain —
  // retention drifts modestly upward over the window (incentives working),
  // landing in the low-to-mid 50s. This % is the most reflexive variable for
  // how much yield can be redistributed to market participants.
  const rows: { minted: number; redeemed: number }[] = []
  for (let i = 0; i < DAYS; i++) {
    const minted = Math.round(mintedDaily[i])
    const redeemShare = 0.52 - 0.1 * (i / (DAYS - 1)) + normal() * 0.025
    const redeemed = Math.round(minted * Math.min(0.6, Math.max(0.36, redeemShare)))
    rows.push({ minted, redeemed })
  }
  // Scale so cumulative USER net lands exactly on USER_NET_TARGET
  const rawNet = rows.reduce((a, r) => a + r.minted - r.redeemed, 0)
  const scale = USER_NET_TARGET / rawNet
  const scaled = rows.map((r) => ({
    minted: Math.round(r.minted * scale),
    redeemed: Math.round(r.redeemed * scale),
  }))
  // Absorb integer-rounding drift into the final day's mint
  const drift = USER_NET_TARGET - scaled.reduce((a, r) => a + r.minted - r.redeemed, 0)
  scaled[DAYS - 1].minted += drift
  supply = SEED_FLOAT
  let backing = 102.1
  for (let i = 0; i < DAYS; i++) {
    const minted_usd = scaled[i].minted
    const redeemed_usd = scaled[i].redeemed
    cumMint += minted_usd
    cumRedeem += redeemed_usd
    supply += minted_usd - redeemed_usd
    // Retention tracked on user flows (the seed float is protocol-owned)
    const retention_pct = round2((1 - cumRedeem / cumMint) * 100)
    flows_daily.push({
      date: dateOf(i),
      minted_usd,
      redeemed_usd,
      net_usd: minted_usd - redeemed_usd,
      retention_pct,
    })
    backing = Math.min(103, Math.max(101, backing + normal() * 0.28))
    nav_daily.push({
      date: dateOf(i),
      reserve_nav_usd: Math.round(supply * (backing / 100)),
      supply_onchain_usd: supply,
    })
    const apr = round2(Math.min(10.5, Math.max(5.5, 8.4 + normal() * 1.1)))
    yield_daily.push({
      date: dateOf(i),
      basis_apr_30d_pct: apr,
      // Paid to ArchUSD holders — the retention-yield budget line (HOLDER_APR)
      redistributed_usd: Math.round((nav_daily[i].reserve_nav_usd * (HOLDER_APR / 100)) / 365),
    })
  }
}
const navEnd = nav_daily[DAYS - 1]
const redistributedCum = yield_daily.reduce((a, r) => a + r.redistributed_usd, 0)
const reserveNavEnd = navEnd.reserve_nav_usd
const reserve_composition = [
  { asset: 'USDC', share: 0.52 },
  { asset: 'USDT', share: 0.38 },
  { asset: 'Short-dated T-bill fund', share: 0.1 },
].map((c, i, arr) => {
  const nav_usd =
    i === arr.length - 1
      ? reserveNavEnd - arr.slice(0, -1).reduce((a, x) => a + Math.round(reserveNavEnd * x.share), 0)
      : Math.round(reserveNavEnd * c.share)
  return { asset: c.asset, nav_usd, share_pct: round2((nav_usd / reserveNavEnd) * 100) }
})

const archusd = {
  seed_float_usd: SEED_FLOAT,
  supply_onchain_usd: navEnd.supply_onchain_usd,
  reserve_nav_usd: reserveNavEnd,
  backing_ratio_pct: round2((reserveNavEnd / navEnd.supply_onchain_usd) * 100),
  basis_yield_30d_pct: yield_daily[DAYS - 1].basis_apr_30d_pct,
  retention_pct: flows_daily[DAYS - 1].retention_pct,
  yield_redistributed_usd: redistributedCum,
  nav_last_attested: '2026-07-01T11:45:00Z',
  reserve_composition,
  flows_daily,
  nav_daily,
  yield_daily,
}

// ---------------------------------------------------------------- liquidity extension (§8.2)

const swapDepth = tvl_daily[DAYS - 1].swap_usd
const usdtShare = 0.56
const liquidity = {
  swap_pools: [
    { pair: 'BTC/USDT', depth_usd: Math.round(swapDepth * usdtShare) },
    { pair: 'BTC/USDC', depth_usd: swapDepth - Math.round(swapDepth * usdtShare) },
  ],
  lend_available: [
    { asset: 'USDT', available_usd: Math.round(availableLiquidity * 0.6) },
    { asset: 'USDC', available_usd: availableLiquidity - Math.round(availableLiquidity * 0.6) },
  ],
}

// ---------------------------------------------------------------- budget (the budget machine — Economic Model v0.3)
// Income (two engines) → wedge → retention yield → buffer fill → surplus
// deployed into the ecosystem (the compounding sink).

const floatIncomeDaily = yield_daily.map(
  (y, i) => (nav_daily[i].reserve_nav_usd * (y.basis_apr_30d_pct / 100)) / 365,
)
const onchainIncomeDaily = revenue_daily.map((r) => revTotalOf(r))
const wedgeDaily = utilization_daily.map(
  (u, i) =>
    (depositSeries[i] *
      ((u.supply_apy_pct - u.borrow_apr_pct * (u.utilization_pct / 100)) / 100)) /
    365,
)
const retentionDaily = yield_daily.map((y) => y.redistributed_usd)

const surplus_daily: { date: string; deployed_usd: number; cumulative_usd: number }[] = []
{
  let cum = 0
  for (let i = 0; i < DAYS; i++) {
    const deployed = Math.round(
      floatIncomeDaily[i] + onchainIncomeDaily[i] - wedgeDaily[i] - retentionDaily[i],
    )
    cum += deployed
    surplus_daily.push({ date: dateOf(i), deployed_usd: deployed, cumulative_usd: cum })
  }
}

const income30Float = Math.round(floatIncomeDaily.reduce((a, b) => a + b, 0))
const income30Onchain = onchainIncomeDaily.reduce((a, b) => a + b, 0)
const wedge30 = Math.round(wedgeDaily.reduce((a, b) => a + b, 0))
const retention30 = retentionDaily.reduce((a, b) => a + b, 0)
const surplus30 = surplus_daily.reduce((a, r) => a + r.deployed_usd, 0)

// Buffer: 12 months of wedge at current book; seeded full at genesis, so no top-up this window.
const annualWedgeEnd = Math.round(
  lendDepositsEnd * ((LENDER_APY_TARGET - BORROW_APR_TARGET * (UTILIZATION / 100)) / 100),
)
const budget = {
  targets: {
    lender_apy_pct: LENDER_APY_TARGET,
    borrow_apr_pct: BORROW_APR_TARGET,
    retention_band_min_pct: 50,
    retention_band_max_pct: 60,
    buffer_target_months: 12,
  },
  income_30d: {
    float_usd: income30Float,
    onchain_usd: income30Onchain,
    total_usd: income30Float + income30Onchain,
  },
  allocations_30d: {
    wedge_usd: wedge30,
    retention_yield_usd: retention30,
    buffer_topup_usd: 0,
    surplus_deployed_usd: surplus30,
  },
  buffer: {
    balance_usd: annualWedgeEnd,
    target_usd: annualWedgeEnd,
    months_cover: 12,
  },
  surplus_deployed_cum_usd: surplus_daily[DAYS - 1].cumulative_usd,
  surplus_daily,
  funded_without_buffer_draw: surplus_daily.every((r) => r.deployed_usd >= 0),
}

// ---------------------------------------------------------------- assemble

const revPrev = revTotalOf(revenue_daily[DAYS - 2])
const revLast = revTotalOf(revenue_daily[DAYS - 1])

const data: MockData = {
  meta: {
    as_of: AS_OF,
    refresh_minutes: 10,
    arch_block: 14382116,
    btc_anchor_block: 905218,
    btc_price_usd: BTC_PRICE,
  },
  overview: {
    total_revenue_usd: totalRevenue,
    revenue_change_24h_pct: round2(((revLast - revPrev) / revPrev) * 100),
    tvl_usd: tvlEnd,
    tvl_change_24h_pct: round2(((tvlEnd - tvlPrev) / tvlPrev) * 100),
    cumulative_volume_usd: volume_daily[DAYS - 1].cumulative_usd,
    volume_24h_usd: volume_daily[DAYS - 1].volume_usd,
    lp_yield_distributed_usd: lpCumulative,
    lp_yield_7d_usd: lp7d,
    btc_on_arch: totalCollateralBtc,
    active_loans: LOAN_COUNT,
    tx_24h: blockspace_daily[DAYS - 1].tx_count,
    avg_block_time_ms: 180,
    validators: 21,
  },
  series: {
    tvl_daily,
    volume_daily,
    revenue_daily,
    lp_yield_daily,
    utilization_daily,
    blockspace_daily,
    assets_by_category,
  },
  risk: {
    total_collateral_btc: totalCollateralBtc,
    total_collateral_usd: totalCollateralUsd,
    total_borrowed_usd: totalBorrowedUsd,
    aggregate_ltv_pct: aggregateLtv,
    utilization_pct: UTILIZATION,
    available_liquidity_usd: availableLiquidity,
    params: {
      max_ltv_pct: MAX_LTV,
      lltv_pct: LLTV,
      liq_penalty_max_pct: 5,
      target_utilization_pct: TARGET_UTIL,
    },
    ltv_distribution,
    loans,
    liquidations,
    loans_issued_cum_usd: Math.round(totalBorrowedUsd * 1.42), // issued > outstanding (repayments)
    loans_issued_count: 297,
    bad_debt_usd: 0,
    insurance_fund_usd: 750000, // [MOCK — mechanism pending confirmation] (Open Item 9)
  },
  flywheel,
  archusd,
  liquidity,
  budget,
}

// ---------------------------------------------------------------- assertions (hard requirement, build handoff §4)

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`ASSERTION FAILED: ${msg}`)
    process.exit(1)
  }
}
const close = (a: number, b: number, tolPct = 0.001) =>
  Math.abs(a - b) <= Math.max(Math.abs(b) * tolPct, 2)

// TVL components sum to totals
assert(close(tvlOf(tvl_daily[DAYS - 1]), data.overview.tvl_usd), 'TVL = swap + deposits + collateral')

// Revenue streams sum to total
assert(
  close(revenue_daily.reduce((a, r) => a + revTotalOf(r), 0), data.overview.total_revenue_usd),
  'revenue streams sum to total revenue',
)

// Cumulative series monotonic and equal sum of dailies
{
  let run = 0
  for (const r of volume_daily) {
    run += r.volume_usd
    assert(r.cumulative_usd === run, `volume cumulative equals running sum @ ${r.date}`)
  }
  run = 0
  for (const r of lp_yield_daily) {
    run += r.distributed_usd
    assert(r.cumulative_usd === run, `lp yield cumulative equals running sum @ ${r.date}`)
    assert(r.swap_usd + r.lend_usd === r.distributed_usd, `lp yield split sums @ ${r.date}`)
  }
}

// Every loan: debt ≤ collateral × max LTV
for (const l of loans) {
  assert(
    l.debt_usd <= l.collateral_btc * BTC_PRICE * (MAX_LTV / 100) + 1,
    `loan ${l.owner_trunc} debt within max LTV`,
  )
}

// Aggregate LTV = Σdebt ÷ Σcollateral
assert(
  close(data.risk.aggregate_ltv_pct, (totalBorrowedUsd / totalCollateralUsd) * 100, 0.01),
  'aggregate LTV derives from loan book',
)

// Utilization = borrowed ÷ deposits; available = deposits − borrowed
assert(
  close(data.risk.utilization_pct, (totalBorrowedUsd / lendDepositsEnd) * 100, 0.01),
  'utilization = borrowed / deposits',
)
assert(
  data.risk.available_liquidity_usd === lendDepositsEnd - totalBorrowedUsd,
  'available = deposits − borrowed',
)

// LTV buckets partition the loan book
assert(
  ltv_distribution.reduce((a, b) => a + b.loan_count, 0) === LOAN_COUNT,
  'LTV buckets cover all loans',
)

// Flywheel ratios derive from flows
assert(
  close(flywheel.ratios.recycle_rate_pct, (flywheel.flows.distributed_usd / flywheel.flows.revenue_usd) * 100, 0.01),
  'recycle rate = distributed / revenue',
)
assert(
  close(flywheel.ratios.attraction_ratio, flywheel.flows.net_new_capital_usd / flywheel.flows.distributed_usd, 0.01),
  'attraction = net new TVL / distributed',
)

// Liquidation revenue stream equals penalties captured per day
for (const r of revenue_daily) {
  assert(
    r.liquidation_usd === (penaltiesByDay.get(r.date) ?? 0),
    `liquidation revenue matches penalties @ ${r.date}`,
  )
}

// ArchUSD: backing 101–103%, retention = 1 − redeemed ÷ minted, supply = Σnet
{
  for (const n of nav_daily) {
    const ratio = (n.reserve_nav_usd / n.supply_onchain_usd) * 100
    assert(ratio >= 100.9 && ratio <= 103.1, `backing ratio in 101–103% band @ ${n.date}`)
  }
  const cumMint = flows_daily.reduce((a, r) => a + r.minted_usd, 0)
  const cumRedeem = flows_daily.reduce((a, r) => a + r.redeemed_usd, 0)
  assert(
    close(data.archusd.retention_pct, (1 - cumRedeem / cumMint) * 100, 0.01),
    'retention = 1 − redeemed / minted (user flows)',
  )
  assert(
    close(navEnd.supply_onchain_usd, SEED_FLOAT + cumMint - cumRedeem),
    'supply equals seed float + cumulative user net flow',
  )
  assert(navEnd.supply_onchain_usd === SUPPLY_END, 'supply lands on target')
}

// Liquidity extension sums tie back
assert(
  liquidity.swap_pools.reduce((a, p) => a + p.depth_usd, 0) === tvl_daily[DAYS - 1].swap_usd,
  'pool depths sum to swap TVL',
)
assert(
  liquidity.lend_available.reduce((a, p) => a + p.available_usd, 0) === availableLiquidity,
  'lend available sums to available liquidity',
)

// Budget: income = engines; allocations sum to income; buffer full; surplus monotonic
assert(
  close(budget.income_30d.total_usd, budget.income_30d.float_usd + budget.income_30d.onchain_usd),
  'budget income = float engine + on-chain engine',
)
assert(
  close(
    budget.allocations_30d.wedge_usd +
      budget.allocations_30d.retention_yield_usd +
      budget.allocations_30d.buffer_topup_usd +
      budget.allocations_30d.surplus_deployed_usd,
    budget.income_30d.total_usd,
    0.005,
  ),
  'budget allocations sum to income',
)
assert(
  budget.buffer.months_cover === budget.targets.buffer_target_months,
  'buffer at target cover',
)
assert(
  surplus_daily.every((r, i) => i === 0 || r.cumulative_usd >= surplus_daily[i - 1].cumulative_usd),
  'deployed surplus is cumulative and non-decreasing',
)
assert(
  utilization_daily.every((u) => u.supply_apy_pct > u.borrow_apr_pct),
  'the wedge holds: lender APY above borrower APR every day',
)

// Assets by category ties to TVL
assert(
  close(
    assets_by_category.reduce((a, c) => a + c.deposited_usd, 0),
    tvlEnd,
  ),
  'assets-by-category deposits sum to TVL',
)

// ---------------------------------------------------------------- write

const outPath = join(dirname(fileURLToPath(import.meta.url)), 'mock.json')
writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n')
console.log(`mock.json written (${DAYS} days, ${LOAN_COUNT} loans). All assertions passed.`)
console.log(
  `  TVL $${(tvlEnd / 1e6).toFixed(1)}M · revenue $${(totalRevenue / 1e3).toFixed(0)}K · ` +
    `agg LTV ${aggregateLtv}% · recycle ${flywheelRatios.recycle_rate_pct}% · attraction ${flywheelRatios.attraction_ratio}×`,
)
