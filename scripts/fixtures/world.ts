import type { AnalyticsData, ChartRow, RawMarket } from '../../server/analytics.js'
import type { Config } from '../../server/config.js'
import type { ExplorerData } from '../../server/explorer.js'
import type { RawAccount, RawBalance, RawBalanceSide, RawLoanBook } from '../../server/rawLoanBook.js'

// A small invented protocol in the shapes the two upstream APIs serve, with
// round numbers so every figure the snapshot derives from it can be worked
// out by hand. Nothing here is real data. Four days of history; "now" is
// half past noon on the fourth.

export const NOW = new Date('2026-11-04T12:30:00Z')

export const USD = 'usd-mint'
export const BTC = 'btc-mint'
export const SHARE = 'share-mint'
export const ETH = 'eth-mint'

export const USD_BANK = 'usd-bank'
export const BTC_BANK = 'btc-bank'
export const SHARE_BANK = 'share-bank'
export const ETH_BANK = 'eth-bank'

export const config: Config = {
  network: 'mainnet',
  analyticsBaseUrl: 'https://analytics.example',
  explorerBaseUrl: 'https://explorer.example/api/v1/mainnet',
  explorerApiKey: undefined,
  explorerSiteUrl: 'https://explorer.example',
  abtcMint: BTC,
  ausdMint: USD,
  programs: { swap: 'swap-program', lend: 'lend-program', vaults: 'vaults-program', propamm: 'propamm-program' },
  historyStart: '2026-11-01T00:00:00Z',
  refreshSeconds: 60,
}

const day = (d: number) => `2026-11-0${d}T00:00:00Z`
const hour = (d: number, h: number) => `2026-11-0${d}T${String(h).padStart(2, '0')}:00:00Z`

const noFlows: RawMarket['activity_24h'] = { deposit_usd: null, withdraw_usd: null, borrow_usd: null, repay_usd: null }

function market(
  address: string,
  mint: string,
  units: { assets: string; liabilities: string },
  price: RawMarket['state']['price'],
  over: Partial<RawMarket['config']> = {},
  flows: Partial<RawMarket['activity_24h']> = {},
): RawMarket {
  const usd = (v: string) => (price.usd === null ? null : String(Number(v) * Number(price.usd)))
  const available = String(Number(units.assets) - Number(units.liabilities))
  return {
    address,
    mint,
    liquidity_vault: `${address}-liquidity`,
    activity_24h: { ...noFlows, ...flows },
    config: {
      asset_weight_init: 0.8,
      asset_weight_maint: 0.9,
      liability_weight_init: 1.25,
      liability_weight_maint: 1.1,
      borrow_limit: '1000000',
      liquidation_fee: 0.025,
      operational_state: 'operational',
      risk_tier: 'collateral',
      oracle: { setup: 'dia', max_age: 360 },
      emode: { tag: 0, entries: [] },
      interest_rate: { optimal_utilization_rate: 0.8, plateau_interest_rate: 0.1, max_interest_rate: 3 },
      ...over,
    },
    state: {
      total_assets_usd: usd(units.assets),
      total_liabilities_usd: usd(units.liabilities),
      available_usd: usd(available),
      total_assets: units.assets,
      total_liabilities: units.liabilities,
      available,
      utilization: Number(units.liabilities) / Number(units.assets),
      lending_rate_apr: 0.02,
      borrowing_rate_apr: 0.06,
      price,
    },
  }
}

// USD: 1,000 supplied, 400 borrowed, at a fixed $1. Over the last 24 hours
//   300 came in and 100 went out; 50 was borrowed and 20 repaid.
// BTC: 0.5 supplied, 0.1 borrowed, at $50,000. 1,000 came in and 1,500 went
//   out; 200 was repaid and nothing borrowed.
// Vault shares: 0.2 supplied as collateral, at $50,500 a share. Weighed at
//   0.95 / 0.98 in an account whose every debt is BTC (e-mode).
// ETH: 2 supplied, no reference price, borrowing off. Its oracle reads $2,000.
const markets: RawMarket[] = [
  market(
    USD_BANK,
    USD,
    { assets: '1000', liabilities: '400' },
    { usd: '1', source: 'const', as_of: null },
    {},
    { deposit_usd: '300', withdraw_usd: '100', borrow_usd: '50', repay_usd: '20' },
  ),
  market(
    BTC_BANK,
    BTC,
    { assets: '0.5', liabilities: '0.1' },
    { usd: '50000', source: 'coinbase', as_of: hour(4, 12) },
    { emode: { tag: 2, entries: [{ collateral_tag: 1, asset_weight_init: 0.95, asset_weight_maint: 0.98 }] } },
    { deposit_usd: '1000', withdraw_usd: '1500', repay_usd: '200' },
  ),
  market(
    SHARE_BANK,
    SHARE,
    { assets: '0.2', liabilities: '0' },
    { usd: '50500', source: 'vault:the-vault', as_of: hour(4, 12) },
    { emode: { tag: 1, entries: [] } },
  ),
  market(
    ETH_BANK,
    ETH,
    { assets: '2', liabilities: '0' },
    { usd: null, source: null, as_of: null },
    { borrow_limit: '0', oracle: { setup: 'arch', max_age: 120 } },
  ),
]

const v = (t: string, value: string): ChartRow => ({ t, v: value })

const none = (weight: number): RawBalanceSide => ({ amount: '0', amount_usd: 0, weight_maint: weight })

/** A deposit: `usd` null for a token without a reference price. */
const deposit = (mint: string, amount: string, usd: number | null, weight: number): RawBalance => ({
  mint,
  side: 'asset',
  asset: { amount, amount_usd: usd, weight_maint: weight },
  liability: none(1.1),
})

const debt = (mint: string, amount: string, usd: number): RawBalance => ({
  mint,
  side: 'liability',
  asset: none(0.9),
  liability: { amount, amount_usd: usd, weight_maint: 1.1 },
})

const healthy = (assets: number, liabilities: number): RawAccount['health'] => ({
  maintenance: { ok: assets > liabilities, health_factor: (assets - liabilities) / assets },
})

// Four accounts, three owners. Deposits weigh 0.9 and debts 1.1, except the
// vault shares, which weigh 0.98 against BTC debt (e-mode).
//   1. $400 of BTC against 300 USD of debt: 360 weighted against 330. A fall
//      in BTC of 10% leaves 324, and it can be liquidated.
//   2. 150 USD against $100 of BTC debt: 135 against 110. A rise of 30% makes
//      the debt 143, and it can be liquidated; at 20% it is 132 and holds.
//   3. $252.50 of vault shares against $200 of BTC debt: 247.45 against 220.
//      Both sides move with BTC, so no move liquidates it.
//   4. ETH, which has no reference price, against 5,000 USD: no reading.
export const loanBook: RawLoanBook = {
  accounts: [
    {
      authority: 'wallet-1',
      borrowed_usd: 300,
      health: healthy(360, 330),
      balances: [deposit(BTC, '0.008', 400, 0.9), debt(USD, '300', 300)],
    },
    {
      authority: 'wallet-1',
      borrowed_usd: 100,
      health: healthy(135, 110),
      balances: [deposit(USD, '150', 150, 0.9), debt(BTC, '0.002', 100)],
    },
    {
      authority: 'wallet-3',
      borrowed_usd: 200,
      health: healthy(247.45, 220),
      balances: [deposit(SHARE, '0.005', 252.5, 0.98), debt(BTC, '0.004', 200)],
    },
    {
      authority: 'wallet-2',
      borrowed_usd: 5000,
      health: null,
      balances: [deposit(ETH, '2', null, 0), debt(USD, '5000', 5000)],
    },
  ],
}

export const analytics: AnalyticsData = {
  version: { version: '9.9.9', commit: 'abcdef0', data_revision: 21 },
  sync: {
    checkpoints: [
      { name: 'clamm', updated_at: '2026-11-04T12:29:40Z' },
      { name: 'arch_lend', updated_at: '2026-11-04T12:29:10Z' },
    ],
    replays: [],
  },
  pools: [
    {
      address: 'the-pool',
      mint_a: BTC,
      mint_b: USD,
      tvl_usd: '3000',
      volume_24h_usd: '500',
      volume_7d_usd: '2000',
      volume_30d_usd: '2500',
      swaps_24h: 12,
      fees_24h_usd: '1.5',
      fee_apr: 0.1825,
    },
  ],
  markets,
  vaults: [
    {
      address: 'the-vault',
      share_mint: SHARE,
      asset_mint: BTC,
      total_assets: '0.3',
      share_supply: '0.297',
      nav_per_share: '1.01',
      tvl_usd: '15000',
      deposits_24h_usd: '700',
      redemptions_24h_usd: '200',
    },
  ],
  lending: {
    borrow_events: 7,
    borrowers: 4,
    borrow_volume_usd: '9000',
    liquidation_events: 0,
    liquidation_seized_usd: null,
    liquidation_repaid_usd: null,
    bankruptcy_events: 0,
    bad_debt_usd: null,
  },
  loanBook,
  // No row on the 2nd: its levels hold the 1st's.
  tvlDaily: [
    { t: day(1), swap_liquidity_usd: '1000', lend_available_usd: '10000', vault_assets_usd: '5000' },
    { t: day(3), swap_liquidity_usd: '2000', lend_available_usd: '18000', vault_assets_usd: '12000' },
    { t: day(4), swap_liquidity_usd: '3000', lend_available_usd: '20600', vault_assets_usd: '15000' },
  ],
  // 24 hours before the last reading stands 35,000. The 13:00 row lacks a
  // vault reading and holds the one before it.
  tvlHourly: [
    { t: hour(3, 11), swap_liquidity_usd: '2500', lend_available_usd: '18000', vault_assets_usd: '13000' },
    { t: hour(3, 12), swap_liquidity_usd: '2500', lend_available_usd: '19000', vault_assets_usd: '13500' },
    { t: hour(3, 13), swap_liquidity_usd: '2600', lend_available_usd: '19000', vault_assets_usd: null },
    { t: hour(4, 12), swap_liquidity_usd: '3000', lend_available_usd: '20600', vault_assets_usd: '15000' },
  ],
  volumeDaily: [
    { t: day(1), volume_usd: '100', propamm_volume_usd: '50' },
    { t: day(3), volume_usd: '200', propamm_volume_usd: null },
    { t: day(4), volume_usd: '300', propamm_volume_usd: '25' },
  ],
  volumeLastDay: [
    { t: hour(3, 12), volume_usd: '150', propamm_volume_usd: '15' },
    { t: hour(4, 9), volume_usd: '350', propamm_volume_usd: '25' },
  ],
  volumePrevDay: [
    { t: hour(2, 12), volume_usd: '250', propamm_volume_usd: null },
    { t: hour(3, 8), volume_usd: '150', propamm_volume_usd: '50' },
  ],
  feesDaily: [
    { t: day(1), swap_fees_usd: '1' },
    { t: day(3), swap_fees_usd: '2' },
    { t: day(4), swap_fees_usd: '1.5' },
  ],
  interestDaily: [
    { t: day(2), lend_supplier_interest_usd: '0.5' },
    { t: day(4), lend_supplier_interest_usd: '0.25' },
  ],
  bankSeries: {
    // No utilization on the 2nd: the market held no deposits that day.
    [USD_BANK]: {
      utilization: [v(day(1), '0.2'), v(day(3), '0.5'), v(day(4), '0.4')],
      borrowApr: [v(day(1), '0.03'), v(day(3), '0.07'), v(day(4), '0.06')],
      supplyApr: [v(day(1), '0.005'), v(day(3), '0.03'), v(day(4), '0.02')],
      curve: [
        { utilization: 0, supply_apr: 0, borrow_apr: 0 },
        { utilization: 0.8, supply_apr: 0.08, borrow_apr: 0.1 },
        { utilization: 1, supply_apr: 3, borrow_apr: 3 },
      ],
    },
    [BTC_BANK]: {
      utilization: [v(day(3), '0.1'), v(day(4), '0.2')],
      borrowApr: [v(day(3), '0.01'), v(day(4), '0.02')],
      supplyApr: [v(day(3), '0.001'), v(day(4), '0.004')],
      curve: [],
    },
  },
  // Debt of 4,500 at noon on the 3rd (300 + 4,200; USD has no bucket at 13:00
  // and holds its 300) against 5,400 now.
  borrowedHourly: {
    [USD_BANK]: [v(hour(3, 11), '280'), v(hour(3, 12), '300'), v(hour(4, 12), '400')],
    [BTC_BANK]: [v(hour(3, 12), '4200'), v(hour(3, 13), '4300'), v(hour(4, 12), '5000')],
  },
  oracleHourly: {
    [ETH_BANK]: [v(hour(4, 11), '1990'), v(hour(4, 12), '2000')],
    [USD_BANK]: [v(hour(4, 11), '0.9997'), v(hour(4, 12), '0.9998')],
  },
  legacyTvl: null,
}

export const explorer: ExplorerData = {
  stats: {
    total_transactions: 5_000_000,
    latest_block_height: 1_234_567,
    latest_indexed_block_timestamp: '2026-11-04T12:29:55Z',
    peak_tps: 12,
    tx_24h: 43_200,
    total_accounts: 9_000,
  },
  // One block every half second.
  blocks24h: 172_800,
  // The explorer listed three programs, fewer than it would at most: one it
  // left out had no transaction.
  programCounts: { counts: { 'swap-program': 12, 'lend-program': 9, 'another-program': 40_000 }, complete: true },
  txVolume: [
    { date: '2026-10-31T00:00:00Z', count: 0 },
    { date: day(1), count: 30_000 },
    { date: day(2), count: 40_000 },
    { date: day(3), count: 45_000 },
    { date: day(4), count: 20_000 },
  ],
  validatorsActive: 5,
  btcTip: 900_000,
  tokens: {
    [USD]: { symbol: 'aUSD', decimals: 6, supply: '25000000000', holders: 80 },
    [BTC]: { symbol: 'aBTC', decimals: 8, supply: '150000000', holders: 40 },
    [SHARE]: { symbol: 'primeBTC', decimals: 8, supply: '29700000', holders: 10 },
    [ETH]: { symbol: 'aETH', decimals: 9, supply: '3000000000', holders: 3 },
  },
  // The explorer leaves out the 2nd, a day without a transfer.
  ausdAnalytics: {
    total_transfers: 30,
    total_volume_ui: 4_500,
    daily: [
      { day: day(1), transfers: 10, volume_ui: 1_500 },
      { day: day(3), transfers: 20, volume_ui: 3_000 },
    ],
  },
}
