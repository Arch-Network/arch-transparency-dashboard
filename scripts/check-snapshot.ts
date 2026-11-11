import assert from 'node:assert/strict'
import { assemble } from '../server/assemble.js'
import { decodeBridges } from '../server/bridge.js'
import type { Snapshot } from '../src/data/snapshot.js'
import { afterWithdrawal } from '../src/lib/withdrawal.js'
import { ABTC_MINT, AUSD_MINT, bridgeAccounts } from './fixtures/bridgeAccounts.js'
import { olderAnalytics } from './fixtures/olderBuild.js'
import { analytics, BTC_BANK, config, ETH_BANK, explorer, loanBook, NOW, SHARE_BANK, USD_BANK } from './fixtures/world.js'

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

const bridgeConfig = { ...config, ausdMint: AUSD_MINT, abtcMint: ABTC_MINT }
const bridges = decodeBridges(bridgeAccounts, bridgeConfig, NOW)
const current = assemble(analytics, explorer, bridges, config, NOW)
const older = assemble(olderAnalytics, explorer, bridges, config, NOW)
const degraded = assemble(analytics, null, bridges, config, NOW)

check('meta names the build, the slowest decoder and the explorer’s last block', () => {
  assert.equal(current.meta.as_of, '2026-11-04T12:30:00.000Z')
  assert.equal(current.meta.analytics_version, '9.9.9+abcdef0')
  assert.equal(current.meta.data_revision, 21)
  assert.equal(current.meta.analytics_synced_at, '2026-11-04T12:29:10Z')
  assert.equal(current.meta.analytics_replaying, false)
  assert.equal(current.meta.explorer_indexed_at, '2026-11-04T12:29:55Z')
  assert.deepEqual(current.meta.degraded, [])
  assert.equal(current.meta.analytics_api_url, 'https://analytics.example')
  assert.equal(current.meta.history_start, '2026-11-01T00:00:00Z')
  assert.equal(current.meta.explorer_url, 'https://explorer.example')
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

check('TVL change over 24 hours is given in dollars and for each product', () => {
  const { overview } = current
  near(overview.tvl_change_24h_usd, 3600, 'tvl_change_24h_usd')
  assert.deepEqual(
    overview.tvl_components.map((c) => [c.id, c.usd]),
    [
      ['lend', 20600],
      ['vault', 15000],
      ['swap', 3000],
    ],
  )
  // A day earlier: lending 19,000, vaults 13,500, pools 2,500.
  const [lend, vault, swap] = overview.tvl_components
  near(lend.change_24h_pct, (1600 / 19000) * 100, 'lend change')
  near(vault.change_24h_pct, (1500 / 13500) * 100, 'vault change')
  near(swap.change_24h_pct, 20, 'swap change')
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
  // The 24 hours before: 400 in pools and 50 of fills.
  near(overview.volume_prev_24h_usd, 450, 'volume_prev_24h_usd')
  assert.equal(overview.pool_swaps_24h, 12)
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

check('debt is compared with the same hour a day earlier, and flows are net', () => {
  const { lend } = current
  // 5,400 in the latest hour against 300 + 4,200 a day earlier.
  near(lend.borrowed_change_24h_pct, 20, 'borrowed_change_24h_pct')
  near(marketOf(current, USD_BANK).net_deposits_24h_usd, 200, 'aUSD net deposits')
  near(marketOf(current, USD_BANK).net_borrowed_24h_usd, 30, 'aUSD net borrowed')
  near(marketOf(current, BTC_BANK).net_deposits_24h_usd, -500, 'aBTC net deposits')
  near(marketOf(current, BTC_BANK).net_borrowed_24h_usd, -200, 'aBTC net borrowed')
  // Priced and quiet is zero; without a reference price there is no USD flow to give.
  assert.equal(marketOf(current, SHARE_BANK).net_deposits_24h_usd, 0)
  assert.equal(marketOf(current, ETH_BANK).net_deposits_24h_usd, null)
  near(lend.net_deposits_24h_usd, -300, 'net_deposits_24h_usd')
  near(lend.net_borrowed_24h_usd, -170, 'net_borrowed_24h_usd')
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

check('the oracle is reported beside the price for aUSD, which stays at its fixed $1', () => {
  const usd = marketOf(current, USD_BANK)
  assert.equal(usd.price?.usd, 1)
  assert.deepEqual(usd.oracle_reading, { usd: 0.9998, as_of: '2026-11-04T12:00:00Z' })
  assert.equal(usd.oracle, 'dia')
  assert.equal(usd.oracle_max_age_s, 360)
  assert.equal(usd.liquidity_account, 'usd-bank-liquidity')
  assert.deepEqual(marketOf(current, ETH_BANK).oracle_reading, { usd: 2000, as_of: '2026-11-04T12:00:00Z' })
  assert.equal(marketOf(current, ETH_BANK).oracle_max_age_s, 120)
  assert.equal(marketOf(current, BTC_BANK).oracle_reading, null)
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
  assert.equal(book.accounts, 4)
  assert.equal(book.wallets, 3)
  // 360 weighted against 330: 30 / 360.
  near(book.lowest_buffer_pct, (30 / 360) * 100, 'lowest_buffer_pct')
  assert.deepEqual(
    book.health_bands.map((b) => [b.id, b.accounts, b.borrowed_usd]),
    [
      ['liquidatable', 0, 0],
      ['under_10', 1, 300],
      ['from_10_to_25', 2, 300],
      ['from_25_to_50', 0, 0],
      ['over_50', 0, 0],
      ['unrated', 1, 5000],
    ],
  )
  assert.ok(!/wallet-\d/.test(JSON.stringify(current)), 'no owner address reaches the snapshot')
})

check('concentration: the largest wallet’s share of debt, and what is owed and held, by market', () => {
  const book = current.lend.loan_book
  assert.ok(book)
  near(book.debt_usd, 5600, 'debt_usd')
  // One wallet owes 5,000 of the 5,600; the next owes 400 across two accounts.
  near(book.largest_borrower_pct, (5000 / 5600) * 100, 'largest_borrower_pct')
  assert.deepEqual(book.owed, [
    { symbol: 'aUSD', usd: 5300 },
    { symbol: 'aBTC', usd: 300 },
  ])
  assert.deepEqual(book.deposited, [
    { symbol: 'aBTC', usd: 400 },
    { symbol: 'primeBTC', usd: 252.5 },
    { symbol: 'aUSD', usd: 150 },
  ])
  assert.deepEqual(book.deposited_unpriced, ['aETH'])
})

check('stress: a BTC move liquidates the accounts it tips over, whichever way it goes', () => {
  const stress = current.lend.loan_book?.stress
  assert.ok(stress)
  assert.deepEqual([stress.rated_accounts, stress.rated_debt_usd], [3, 600])
  assert.deepEqual([stress.unrated_accounts, stress.unrated_debt_usd], [1, 5000])
  // A fall tips the account holding BTC against USD debt; a rise of 30%, not
  // 20%, the one owing BTC against USD; none the one with BTC on both sides.
  assert.deepEqual(
    stress.scenarios.map((s) => [s.btc_move_pct, s.accounts, s.debt_usd]),
    [
      [-50, 1, 300],
      [-30, 1, 300],
      [-20, 1, 300],
      [-10, 1, 300],
      [0, 0, 0],
      [10, 0, 0],
      [20, 0, 0],
      [30, 1, 100],
    ],
  )
})

check('stress: nothing is published unless the unmoved book matches the loan book’s verdicts', () => {
  const [first, ...rest] = loanBook.accounts
  const disagreeing = { ...first, health: { maintenance: { ok: false, health_factor: -0.1 } } }
  const book = (accounts: typeof loanBook.accounts) =>
    assemble({ ...analytics, loanBook: { accounts } }, explorer, bridges, config, NOW).lend.loan_book
  assert.equal(book([disagreeing, ...rest])?.stress, null)
  // A build that serves the accounts without their balances.
  const bare = loanBook.accounts.map(({ balances: _, ...account }) => account)
  assert.equal(book(bare)?.stress, null)
  assert.deepEqual(book(bare)?.owed, [])
})

check('a withdrawal leaves the debt over what remains, and cannot take what is borrowed', () => {
  // 1,000 supplied, 400 borrowed: 600 can leave.
  const quarter = afterWithdrawal(1000, 400, 25)
  near(quarter.utilization_pct, (400 / 750) * 100, 'utilization after 25%')
  assert.equal(quarter.unmet_usd, 0)
  // 750 asked for: 600 leave, 400 remain and all of it is borrowed.
  const most = afterWithdrawal(1000, 400, 75)
  near(most.utilization_pct, 100, 'utilization after 75%')
  near(most.unmet_usd, 150, 'unmet after 75%')
})

check('the bridges’ settings are decoded from their accounts as the chain holds them', () => {
  assert.deepEqual(current.bridges, {
    read_at: '2026-11-04T12:30:00.000Z',
    ausd: {
      program: 'd14535a471647c7246c9ff0d79097ebef3f914b9dce2bf6cee428893b2b5c98b',
      signers_required: 1,
      paused: { minting: false, redemption_requests: false, redemption_settlement: false },
      supply_cap: 20_000_000,
      treasury_key_set: true,
      routes: [1, 2].map((id) => ({
        id,
        min_redemption: 10,
        redemption_fee: 0.1,
        deposits_enabled: true,
        redemptions_enabled: true,
      })),
    },
    abtc: {
      program: '85b49cefeec08506ef9bf0a641abe5a0d85fe584a380eb66442a3f6fe1f8ca11',
      deposit_fee_sats: 1000,
      paused: { deposits: false, withdrawals: false },
      treasury_credit_set_up: false,
    },
  })
})

check('a bridge account that is not what it should be fails the read, and the gap is named', () => {
  const [settings, asset, route1, route2, btc] = bridgeAccounts
  const decode = (accounts: typeof bridgeAccounts) => () => decodeBridges(accounts, bridgeConfig, NOW)
  // Another program's account, a missing account, another token's route, and a cut-short account.
  assert.throws(decode([{ ...settings!, owner: 'someone-else' }, asset, route1, route2, btc, null]), /owned by/)
  assert.throws(decode([settings, null, route1, route2, btc, null]), /not found/)
  assert.throws(decode([settings, asset, route1, route1, btc, null]), /route id/)
  assert.throws(decode([settings, asset, route1, route2, { ...btc!, data: btc!.data.subarray(0, 700) }, null]))
  assert.throws(() => decodeBridges(bridgeAccounts, config, NOW), /asset mint/)

  // The pause bits and an absent treasury key read as such.
  const paused = Buffer.from(settings!.data)
  paused[261] = 0b101
  const keyless = Buffer.from(asset!.data)
  keyless[44] = 0
  const changed = decodeBridges(
    [{ ...settings!, data: paused }, { ...asset!, data: keyless }, route1, route2, btc, btc],
    bridgeConfig,
    NOW,
  )
  assert.deepEqual(changed.ausd.paused, { minting: true, redemption_requests: false, redemption_settlement: true })
  assert.equal(changed.ausd.treasury_key_set, false)
  assert.equal(changed.abtc.treasury_credit_set_up, true)

  const unread = assemble(analytics, explorer, null, config, NOW)
  assert.equal(unread.bridges, null)
  assert.deepEqual(unread.meta.degraded, ['bridges'])
  // Off mainnet there is nothing to read, so nothing is missing.
  assert.deepEqual(assemble(analytics, explorer, null, { ...config, archRpcUrl: null }, NOW).meta.degraded, [])
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

check('pools and vaults carry their activity and the vault its share price', () => {
  assert.deepEqual(current.pools, [
    {
      address: 'the-pool',
      pair: 'aBTC/aUSD',
      tvl_usd: 3000,
      volume_24h_usd: 500,
      volume_7d_usd: 2000,
      volume_30d_usd: 2500,
      swaps_24h: 12,
      fees_24h_usd: 1.5,
      fee_apr_pct: 18.25,
    },
  ])
  assert.deepEqual(current.vaults, [
    {
      address: 'the-vault',
      share_mint: 'share-mint',
      share_symbol: 'primeBTC',
      asset_symbol: 'aBTC',
      total_assets: 0.3,
      share_supply: 0.297,
      nav_per_share: 1.01,
      assets_usd: 15000,
      deposits_24h_usd: 700,
      redemptions_24h_usd: 200,
    },
  ])
})

check('program transactions: a program the explorer left out of a complete list had none', () => {
  const tx = (s: Snapshot) => s.chain?.programs.map((p) => [p.id, p.address, p.tx_24h])
  assert.deepEqual(tx(current), [
    ['swap', 'swap-program', 12],
    ['lend', 'lend-program', 9],
    ['vaults', 'vaults-program', 0],
    ['propamm', 'propamm-program', 0],
  ])
  // Cut short, the list says nothing about a program it does not name.
  const cutShort = { ...explorer, programCounts: { counts: { 'swap-program': 12 }, complete: false } }
  assert.deepEqual(
    assemble(analytics, cutShort, bridges, config, NOW).chain?.programs.map((p) => p.tx_24h),
    [12, null, null, null],
  )
  const unanswered = assemble(analytics, { ...explorer, programCounts: null }, bridges, config, NOW)
  assert.ok(unanswered.chain?.programs.every((p) => p.tx_24h === null))
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
  near(overview.tvl_change_24h_usd, 2500, 'tvl_change_24h_usd')
  // Lending without the share bank: 20,600 − 10,100 now against 19,000 − 9,000.
  near(overview.tvl_components[0].change_24h_pct, 5, 'lend change')
  near(overview.tvl_components[0].usd, 24600, 'lend component')
})

check('older build: pool swaps alone, interest estimated through the last closed day', () => {
  const { overview, series, lend } = older
  assert.equal(overview.propamm_volume_cum_usd, null)
  assert.equal(overview.propamm_volume_24h_usd, null)
  near(overview.volume_cum_usd, 600, 'volume_cum_usd')
  near(overview.volume_24h_usd, 500, 'volume_24h_usd')
  near(overview.volume_prev_24h_usd, 400, 'volume_prev_24h_usd')
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
