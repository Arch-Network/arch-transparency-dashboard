import type { ChainAccount } from '../../server/archRpc.js'
import { EXCHANGE_ACCOUNT_LEN, type PerpsData } from '../../server/perps.js'

// Fixed synthetic perps payloads with round numbers so every derived metric
// (prices, OI, volume, spread, funding APR, max leverage, on-chain Exchange
// decoding) can be verified by hand in `scripts/check-snapshot.ts`.

export const PERPS_PROGRAM = 'e1779558aed6d7b386f2eec68d985042a058c8cbd7660081ed98f34d2c00e266'
export const PERPS_EXCHANGE = '990e99f14585dd86e77370d39821a3eb66aaa9a296d8be75cfe873210c231be9'
export const PERPS_MINT = 'b8586267326264db356ca4c92b61dee74b4510cb95488897191d18520b3b18a4'

/** Builds a valid 168-byte on-chain `Exchange` account buffer (`PXEXCHNG`). */
export function makeExchangeAccount(opts?: {
  owner?: string
  mint?: string
  settleSeq?: bigint
  totalBalanceAtoms?: bigint
  withdrawDelayS?: bigint
  paused?: boolean
}): ChainAccount {
  const buf = Buffer.alloc(EXCHANGE_ACCOUNT_LEN)
  buf.write('PXEXCHNG', 0, 'latin1')
  Buffer.from(opts?.mint ?? PERPS_MINT, 'hex').copy(buf, 104)
  buf.writeBigUInt64LE(opts?.settleSeq ?? 500n, 136)
  buf.writeBigUInt64LE(opts?.totalBalanceAtoms ?? 12_500_000_000n, 144) // $12,500
  buf.writeBigInt64LE(opts?.withdrawDelayS ?? 86_400n, 152) // 24 h
  buf.writeUInt8(opts?.paused ? 1 : 0, 160)
  return {
    owner: opts?.owner ?? PERPS_PROGRAM,
    data: buf,
  }
}

export const perpsFixture: PerpsData = {
  info: {
    exchange: PERPS_EXCHANGE,
    program: PERPS_PROGRAM,
    mint: PERPS_MINT,
    operator: '11'.repeat(32),
    maker: '22'.repeat(32),
    network: 'mainnet',
    rpc_url: 'https://rpc.example',
    collateral_decimals: 6,
  },
  stats: {
    // BTC-PERP: (4000 + 1000) * 60000 = 300,000,000 atoms ($300)
    // NVDA-PERP: (0 + 2000) * 100000 = 200,000,000 atoms ($200)
    // Total gross notional = $500
    gross_notional: 500_000_000,
    net_notional: 380_000_000,
    maker_requirement: 40_000_000,
    unnetted_requirement: 25_000_000,
    maker_equity: 10_000_000_000, // $10,000
    insurance_fund: 5_000_000, // $5
    fees_collected: 12_500_000, // $12.50
    accounts: 20,
    open_orders: 3,
    settle_seq: 500,
    halted: null,
  },
  health: {
    status: 'ok',
    build_sha: 'deadbeef1234567890',
    exchange: PERPS_EXCHANGE,
    halted: null,
    markets: 2,
    markets_priced: 2,
    markets_quoted: 2,
    settle_seq: 500,
  },
  markets: [
    {
      market: 0,
      symbol: 'BTC-PERP',
      lots_per_unit: 1_000_000,
      // 60,000 atoms/lot * 1,000,000 / 1,000,000 = $60,000
      index_price: 60_000,
      mark_price: 60_000,
      mark_at_ms: Date.parse('2026-11-04T12:29:50Z'),
      // bid $59,994, ask $60,006 -> mid $60,000, spread = 12 / 60,000 = 2 bps
      levels: [
        { max_lots: 1_000_000, bid: 59_994, ask: 60_006 },
        { max_lots: 2_000_000, bid: 59_980, ask: 60_020 },
      ],
      // 10 ppm/hr = 0.001%/hr = 0.008%/8h = 8.76% APR
      funding_rate_ppm_per_hour: 10,
      long_lots: 4_000, // $240
      short_lots: 1_000, // $60
      initial_margin_ppm: 50_000, // 5% -> 20x
      maintenance_margin_ppm: 25_000, // 2.5%
      max_order_lots: 10_000_000,
      max_position_lots: 100_000_000,
      taker_fee_ppm: 200, // 2 bps
      liquidation_fee_ppm: 5_000, // 50 bps
      volume_24h: 20_000_000_000, // $20,000
      open_24h: 50_000, // +20% 24h change
      open_24h_at_ms: Date.parse('2026-11-03T12:29:00Z'),
      high_24h: 61_000,
      low_24h: 49_000,
    },
    {
      market: 1,
      symbol: 'NVDA-PERP',
      lots_per_unit: 1_000,
      // 100,000 atoms/lot * 1,000 / 1,000,000 = $100
      index_price: 100_000,
      mark_price: 100_000,
      mark_at_ms: Date.parse('2026-11-04T12:29:50Z'),
      levels: [{ max_lots: 50_000, bid: 99_950, ask: 100_050 }], // 10 bps spread
      // -5 ppm/hr = -0.0005%/hr = -4.38% APR
      funding_rate_ppm_per_hour: -5,
      long_lots: 0,
      short_lots: 2_000, // $200
      initial_margin_ppm: 100_000, // 10% -> 10x
      maintenance_margin_ppm: 50_000, // 5%
      max_order_lots: 1_000_000,
      max_position_lots: 5_000_000,
      taker_fee_ppm: 200,
      liquidation_fee_ppm: 5_000,
      volume_24h: 5_000_000_000, // $5,000
      open_24h: 100_000, // 0% 24h change
      open_24h_at_ms: Date.parse('2026-11-03T12:29:00Z'),
      high_24h: 105_000,
      low_24h: 98_000,
    },
  ],
  fundingByMarket: {
    0: [
      { t: Date.parse('2026-11-04T12:20:00Z'), r: 8 },
      { t: Date.parse('2026-11-04T12:25:00Z'), r: 10 },
    ],
  },
  onChainAccount: makeExchangeAccount(),
}
