import type { AnalyticsData, ChartRow, RawMarket } from '../../server/analytics.js'
import type { Config } from '../../server/config.js'
import type { ExplorerData } from '../../server/explorer.js'

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
  abtcMint: BTC,
  ausdMint: USD,
  historyStart: '2026-11-01T00:00:00Z',
  refreshSeconds: 60,
}

const day = (d: number) => `2026-11-0${d}T00:00:00Z`
const hour = (d: number, h: number) => `2026-11-0${d}T${String(h).padStart(2, '0')}:00:00Z`

function market(
  address: string,
  mint: string,
  units: { assets: string; liabilities: string },
  price: RawMarket['state']['price'],
  over: Partial<RawMarket['config']> = {},
): RawMarket {
  const usd = (v: string) => (price.usd === null ? null : String(Number(v) * Number(price.usd)))
  const available = String(Number(units.assets) - Number(units.liabilities))
  return {
    address,
    mint,
    config: {
      asset_weight_init: 0.8,
      asset_weight_maint: 0.9,
      liability_weight_init: 1.25,
      liability_weight_maint: 1.1,
      borrow_limit: '1000000',
      liquidation_fee: 0.025,
      operational_state: 'operational',
      risk_tier: 'collateral',
      oracle: { setup: 'dia' },
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

// USD: 1,000 supplied, 400 borrowed, at a fixed $1.
// BTC: 0.5 supplied, 0.1 borrowed, at $50,000.
// Vault shares: 0.2 supplied as collateral, at $50,500 a share. Weighed at
//   0.95 / 0.98 in an account whose every debt is BTC (e-mode).
// ETH: 2 supplied, no reference price, borrowing off. Its oracle reads $2,000.
const markets: RawMarket[] = [
  market(USD_BANK, USD, { assets: '1000', liabilities: '400' }, { usd: '1', source: 'const', as_of: null }),
  market(
    BTC_BANK,
    BTC,
    { assets: '0.5', liabilities: '0.1' },
    { usd: '50000', source: 'coinbase', as_of: hour(4, 12) },
    { emode: { tag: 2, entries: [{ collateral_tag: 1, asset_weight_init: 0.95, asset_weight_maint: 0.98 }] } },
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
    { borrow_limit: '0', oracle: { setup: 'arch' } },
  ),
]

const v = (t: string, value: string): ChartRow => ({ t, v: value })

export const analytics: AnalyticsData = {
  version: { version: '9.9.9', commit: 'abcdef0', data_revision: 21 },
  sync: {
    checkpoints: [
      { name: 'clamm', updated_at: '2026-11-04T12:29:40Z' },
      { name: 'arch_lend', updated_at: '2026-11-04T12:29:10Z' },
    ],
    replays: [],
  },
  pools: [{ address: 'the-pool', mint_a: BTC, mint_b: USD, tvl_usd: '3000', volume_24h_usd: '500', fees_24h_usd: '1.5' }],
  markets,
  vaults: [{ share_mint: SHARE, tvl_usd: '15000' }],
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
  // Three accounts, two owners: buffers of 5% and 30%, and one with no reading.
  loanBook: {
    accounts: [
      { authority: 'wallet-1', borrowed_usd: 300, health: { maintenance: { ok: true, health_factor: 0.05 } } },
      { authority: 'wallet-1', borrowed_usd: 100, health: { maintenance: { ok: true, health_factor: 0.3 } } },
      { authority: 'wallet-2', borrowed_usd: 5000, health: null },
    ],
  },
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
  oracleHourly: { [ETH_BANK]: [v(hour(4, 11), '1990'), v(hour(4, 12), '2000')] },
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
