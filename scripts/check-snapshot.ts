import assert from 'node:assert/strict'
import { assemble } from '../server/assemble.js'
import type { Snapshot } from '../src/data/snapshot.js'
import { olderAnalytics } from './fixtures/olderBuild.js'
import { analytics, BTC_BANK, config, ETH_BANK, explorer, NOW, SHARE_BANK, USD_BANK } from './fixtures/world.js'

// Pins what `assemble` derives from a fixed pair of upstream payloads against
// figures worked out by hand from the fixture (`fixtures/world.ts`), for the
// current analytics build and for an older one. Run with `npm run check`.
// No network: the upstream responses are the fixture.

const near = (actual: number | null, expected: number, what: string) => {
  assert.ok(
    actual !== null && Math.abs(actual - expected) < 1e-6,
    `${what}: expected ${expected}, got ${actual}`,
  )
}

const marketOf = (s: Snapshot, address: string) => {
  const m = s.lend.markets.find((x) => x.address === address)
  assert.ok(m, `market ${address} is in the snapshot`)
  return m
}

const checks: [string, () => void][] = []
const check = (name: string, run: () => void) => checks.push([name, run])

const current = assemble(analytics, explorer, config, NOW)
const older = assemble(olderAnalytics, explorer, config, NOW)
const degraded = assemble(analytics, null, config, NOW)

check('meta names the build, the slowest decoder and the explorer’s last block', () => {
  assert.equal(current.meta.as_of, '2026-11-04T12:30:00.000Z')
  assert.equal(current.meta.analytics_version, '9.9.9+abcdef0')
  assert.equal(current.meta.data_revision, 21)
  assert.equal(current.meta.analytics_synced_at, '2026-11-04T12:29:10Z')
  assert.equal(current.meta.analytics_replaying, false)
  assert.equal(current.meta.explorer_indexed_at, '2026-11-04T12:29:55Z')
  assert.deepEqual(current.meta.degraded, [])
})

check('TVL is the three components at their latest reading, each asset once', () => {
  const { overview, series } = current
  near(overview.tvl_usd, 3000 + 20600 + 15000, 'tvl_usd')
  assert.equal(overview.tvl_method, 'protocol')
  // 38,600 now against 35,000 at the same hour a day earlier.
  near(overview.tvl_change_24h_pct, (3600 / 35000) * 100, 'tvl_change_24h_pct')
  assert.deepEqual(
    series.tvl_daily.map((r) => [r.date, r.swap_usd, r.lend_usd, r.vault_usd]),
    [
      ['2026-11-01', 1000, 10000, 5000],
      ['2026-11-02', 1000, 10000, 5000],
      ['2026-11-03', 2000, 18000, 12000],
      ['2026-11-04', 3000, 20600, 15000],
    ],
  )
  // ETH has no reference price: its 2 units are left out, and named at the oracle's $2,000.
  assert.deepEqual(overview.tvl_left_out, [{ symbol: 'aETH', available_usd: 4000 }])
})

check('volume adds pool swaps and PropAMM fills, by day and over the last 24 hours', () => {
  const { overview, series } = current
  assert.deepEqual(
    series.volume_daily.map((r) => [r.pool_usd, r.propamm_usd, r.cumulative_usd]),
    [
      [100, 50, 150],
      [0, 0, 150],
      [200, 0, 350],
      [300, 25, 675],
    ],
  )
  near(overview.pool_volume_cum_usd, 600, 'pool_volume_cum_usd')
  near(overview.propamm_volume_cum_usd, 75, 'propamm_volume_cum_usd')
  near(overview.volume_cum_usd, 675, 'volume_cum_usd')
  near(overview.pool_volume_24h_usd, 500, 'pool_volume_24h_usd')
  near(overview.propamm_volume_24h_usd, 40, 'propamm_volume_24h_usd')
  near(overview.volume_24h_usd, 540, 'volume_24h_usd')
})

check('swap fees and credited interest are summed over the days served', () => {
  const { overview, series } = current
  near(overview.swap_fees_cum_usd, 4.5, 'swap_fees_cum_usd')
  near(overview.swap_fees_30d_usd, 4.5, 'swap_fees_30d_usd')
  near(overview.swap_fees_24h_usd, 1.5, 'swap_fees_24h_usd')
  assert.equal(overview.lender_interest_method, 'credited')
  near(overview.lender_interest_cum_usd, 0.75, 'lender_interest_cum_usd')
  near(overview.lender_interest_7d_usd, 0.75, 'lender_interest_7d_usd')
  // Credited interest is exact through now, so the open day is on the chart.
  assert.deepEqual(
    series.interest_daily.map((r) => [r.date, r.interest_usd, r.cumulative_usd]),
    [
      ['2026-11-01', 0, 0],
      ['2026-11-02', 0.5, 0.5],
      ['2026-11-03', 0, 0.5],
      ['2026-11-04', 0.25, 0.75],
    ],
  )
})

check('lending totals cover every market with a price, largest first', () => {
  const { lend } = current
  assert.deepEqual(
    lend.markets.map((m) => m.symbol),
    ['aBTC', 'primeBTC', 'aETH', 'aUSD'],
  )
  // 25,000 of BTC, 10,100 of shares, 4,000 of ETH at its oracle, 1,000 of USD.
  near(lend.supplied_usd, 40100, 'supplied_usd')
  near(lend.borrowed_usd, 5400, 'borrowed_usd')
  near(lend.available_usd, 34700, 'available_usd')
  near(lend.utilization_pct, (5400 / 40100) * 100, 'utilization_pct')
  assert.equal(lend.borrowers, 4)
  assert.equal(lend.borrow_events, 7)
  near(lend.borrow_volume_usd, 9000, 'borrow_volume_usd')
  assert.equal(lend.bad_debt_usd, 0)
})

check('a market is valued at its reference price, or at its oracle where it has none', () => {
  const usd = marketOf(current, USD_BANK)
  assert.deepEqual(usd.price, { usd: 1, source: 'fixed', as_of: null })
  near(usd.utilization_pct, 40, 'aUSD utilization')
  near(usd.borrow_apr_pct, 6, 'aUSD borrow APR')
  assert.equal(usd.borrowable, true)

  const btc = marketOf(current, BTC_BANK)
  assert.equal(btc.price?.source, 'coinbase')
  near(btc.available_usd, 20000, 'aBTC available')

  const shares = marketOf(current, SHARE_BANK)
  assert.equal(shares.vault_shares, true)
  assert.equal(shares.price?.source, 'vault')

  const eth = marketOf(current, ETH_BANK)
  assert.deepEqual(eth.price, { usd: 2000, source: 'oracle', as_of: '2026-11-04T12:00:00Z' })
  near(eth.supplied_usd, 4000, 'aETH supplied')
  assert.equal(eth.borrowable, false)
})

check('rate history holds rates forward and leaves utilization blank on a day without deposits', () => {
  assert.deepEqual(marketOf(current, USD_BANK).rates_daily, [
    { date: '2026-11-01', utilization_pct: 20, borrow_apr_pct: 3, supply_apr_pct: 0.5 },
    { date: '2026-11-02', utilization_pct: null, borrow_apr_pct: 3, supply_apr_pct: 0.5 },
    { date: '2026-11-03', utilization_pct: 50, borrow_apr_pct: 7.000000000000001, supply_apr_pct: 3 },
    { date: '2026-11-04', utilization_pct: 40, borrow_apr_pct: 6, supply_apr_pct: 2 },
  ])
  assert.equal(marketOf(current, BTC_BANK).rates_daily.length, 2)
  assert.deepEqual(marketOf(current, SHARE_BANK).rates_daily, [])
  assert.deepEqual(marketOf(current, USD_BANK).curve[1], { utilization_pct: 80, borrow_apr_pct: 10, supply_apr_pct: 8 })
})

check('the loan book is counted by liquidation buffer, with no account named', () => {
  const book = current.lend.loan_book
  assert.ok(book)
  assert.equal(book.accounts, 3)
  assert.equal(book.wallets, 2)
  near(book.lowest_buffer_pct, 5, 'lowest_buffer_pct')
  assert.deepEqual(
    book.health_bands.map((b) => [b.id, b.accounts, b.borrowed_usd]),
    [
      ['liquidatable', 0, 0],
      ['under_10', 1, 300],
      ['from_10_to_25', 0, 0],
      ['from_25_to_50', 1, 100],
      ['over_50', 0, 0],
      ['unrated', 1, 5000],
    ],
  )
  assert.ok(!JSON.stringify(current).includes('wallet-1'), 'no owner address reaches the snapshot')
})

check('e-mode pairs the vault shares with BTC debt at the higher weights', () => {
  const pairings = current.lend.emode_pairings
  assert.ok(pairings)
  assert.equal(pairings.length, 1)
  const [p] = pairings
  assert.deepEqual([p.collateral, p.debt, p.asset_weight_init, p.asset_weight_maint], ['primeBTC', 'aBTC', 0.95, 0.98])
  near(p.max_ltv_pct, (0.95 / 1.25) * 100, 'max_ltv_pct')
  near(p.liquidation_ltv_pct, (0.98 / 1.1) * 100, 'liquidation_ltv_pct')
})

check('chain and token figures come from the explorer', () => {
  const { chain, tokens, series, pools } = current
  assert.ok(chain && tokens)
  assert.equal(chain.arch_block, 1_234_567)
  assert.equal(chain.btc_tip_block, 900_000)
  near(chain.tps_24h, 0.5, 'tps_24h')
  near(chain.avg_block_time_ms, 500, 'avg_block_time_ms')
  assert.equal(chain.validators_active, 5)
  near(tokens.ausd_supply, 25000, 'ausd_supply')
  near(tokens.abtc_supply, 1.5, 'abtc_supply')
  assert.equal(tokens.ausd_holders, 80)
  assert.deepEqual(
    tokens.ausd_transfers_daily.map((d) => [d.date, d.transfers, d.volume]),
    [
      ['2026-11-01', 10, 1500],
      ['2026-11-02', 0, 0],
      ['2026-11-03', 20, 3000],
      ['2026-11-04', 0, 0],
    ],
  )
  // The explorer's empty lead-in day is dropped.
  assert.equal(series.tx_daily?.[0].date, '2026-11-01')
  assert.equal(series.tx_daily?.length, 4)
  assert.equal(pools[0].pair, 'aBTC/aUSD')
  near(pools[0].tvl_usd, 3000, 'pool tvl_usd')
})

check('without the explorer the snapshot is served, with the gap named', () => {
  assert.deepEqual(degraded.meta.degraded, ['explorer'])
  assert.equal(degraded.chain, null)
  assert.equal(degraded.tokens, null)
  assert.equal(degraded.series.tx_daily, null)
  near(degraded.overview.tvl_usd, 38600, 'tvl_usd without the explorer')
  // No token list to name a mint from: the market shows its abbreviated mint.
  assert.equal(marketOf(degraded, USD_BANK).symbol, 'usd-…mint')
})

check('older build: lending TVL is rebuilt without the vault-share bank', () => {
  const { overview, series } = older
  assert.equal(older.meta.data_revision, 16)
  assert.equal(overview.tvl_method, 'rebuilt')
  assert.deepEqual(overview.tvl_left_out, [])
  // Closed days: USD + BTC + ETH at its daily oracle price. The open day: the
  // markets now, ETH at 2 × $2,000, beside the pool and the vault now.
  assert.deepEqual(
    series.tvl_daily.map((r) => [r.swap_usd, r.lend_usd, r.vault_usd]),
    [
      [1000, 9400, 5000],
      [1000, 9400, 5000],
      [2000, 21300, 12000],
      [3000, 24600, 15000],
    ],
  )
  near(overview.tvl_usd, 42600, 'tvl_usd')
  // Hourly totals less the share bank: 28,500 now against 26,000 a day earlier.
  near(overview.tvl_change_24h_pct, (2500 / 26000) * 100, 'tvl_change_24h_pct')
})

check('older build: pool swaps alone, interest estimated through the last closed day', () => {
  const { overview, series, lend } = older
  assert.equal(overview.propamm_volume_cum_usd, null)
  assert.equal(overview.propamm_volume_24h_usd, null)
  near(overview.volume_cum_usd, 600, 'volume_cum_usd')
  near(overview.volume_24h_usd, 500, 'volume_24h_usd')
  assert.ok(series.volume_daily.every((r) => r.propamm_usd === null))
  assert.equal(overview.lender_interest_method, 'estimated')
  near(overview.lender_interest_cum_usd, 0.5, 'lender_interest_cum_usd')
  assert.equal(series.interest_daily.length, 3)
  assert.equal(lend.loan_book, null)
  assert.equal(lend.emode_pairings, null)
})

let failed = 0
for (const [name, run] of checks) {
  try {
    run()
    console.log(`ok    ${name}`)
  } catch (err) {
    failed++
    console.log(`FAIL  ${name}\n      ${err instanceof Error ? err.message : String(err)}`)
  }
}
console.log(`\n${checks.length - failed} of ${checks.length} checks passed`)
process.exit(failed === 0 ? 0 : 1)
