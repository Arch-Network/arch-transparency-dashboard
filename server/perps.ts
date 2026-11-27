import type {
  PerpsFundingSeries,
  PerpsMarket,
  PerpsOnChain,
  PerpsSnapshot,
} from '../src/data/perps.js'
import { perpsMarketClass, perpsUnderlying } from '../src/lib/perpsMarketClass.js'
import { readAccounts, type ChainAccount } from './archRpc.js'
import type { GetJson } from './http.js'

// Fetches and assembles live Arch Perps data from:
//   1. The Arch Perps engine's public HTTP API (`/v1/info`, `/v1/stats`,
//      `/v1/markets`, `/health`, and `/v1/funding` for top markets).
//   2. The on-chain `Exchange` account (`PXEXCHNG`, 168 bytes) read through
//      Arch RPC, giving verified on-chain vault collateral, settlement seq,
//      escape-hatch withdrawal delay, and pause state.
//
// All unit conversions match `packages/sdk/src/perps/math.ts` and
// `perps/crates/engine/src/view.rs` in `Arch-Network/arch-prime`.

export interface RawPerpsInfo {
  exchange: string
  program: string
  mint: string
  operator: string
  maker: string
  network: string
  rpc_url: string
  collateral_decimals: number
}

export interface RawPerpsStats {
  gross_notional: number
  net_notional: number
  maker_requirement: number
  unnetted_requirement: number
  maker_equity: number
  insurance_fund: number
  fees_collected: number
  accounts: number
  open_orders: number
  settle_seq: number
  halted: string | null
}

export interface RawPerpsHealth {
  status: string
  build_sha?: string
  exchange: string
  halted: string | null
  markets: number
  markets_priced: number
  markets_quoted: number
  operator_lamports?: number
  settle_seq: number
}

export interface RawPerpsQuoteLevel {
  max_lots: number
  bid: number
  ask: number
}

export interface RawPerpsSplit {
  close_at_ms: number
  reopen_at_ms: number
  shares_after: number
  shares_before: number
  closed: boolean
}

export interface RawPerpsMarket {
  market: number
  symbol: string
  lots_per_unit: number
  index_price: number
  mark_price: number
  mark_at_ms: number
  levels: RawPerpsQuoteLevel[]
  funding_rate_ppm_per_hour: number
  long_lots: number
  short_lots: number
  initial_margin_ppm: number
  maintenance_margin_ppm: number
  max_order_lots: number
  max_position_lots: number
  taker_fee_ppm?: number
  liquidation_fee_ppm?: number
  volume_24h?: number | null
  open_24h?: number | null
  open_24h_at_ms?: number | null
  high_24h?: number | null
  low_24h?: number | null
  split?: RawPerpsSplit | null
}

export interface RawPerpsFundingReading {
  /** Unix ms start of the 5-minute span. */
  t: number
  /** Funding rate in parts per million per hour. */
  r: number
}

export interface PerpsData {
  info: RawPerpsInfo
  stats: RawPerpsStats
  markets: RawPerpsMarket[]
  health: RawPerpsHealth | null
  /** 5-minute funding rate readings keyed by market id. */
  fundingByMarket: Record<number, RawPerpsFundingReading[]>
  /** Raw on-chain `Exchange` account read from Arch RPC; null if unread. */
  onChainAccount: ChainAccount | null
}

/** Frozen layout constants from `perps/program/src/state.rs`. */
const EXCHANGE_DISCRIMINATOR = 'PXEXCHNG'
export const EXCHANGE_ACCOUNT_LEN = 168

const HOURS_PER_YEAR = 8_760
/** How many markets to pull 5-minute funding history for (keeps fan-out tiny). */
const MAX_FUNDING_MARKETS = 6
/** 288 × 5 min = 24 hours of funding history per tracked market. */
const FUNDING_LIMIT = 288
const CORE_FUNDING_SYMBOLS = ['BTC-PERP', 'ETH-PERP', 'SOL-PERP']

/** Picks up to `MAX_FUNDING_MARKETS` markets to fetch funding history for:
 * core crypto markets + any markets with live OI or highest 24h volume. */
export function selectFundingMarkets(markets: RawPerpsMarket[]): RawPerpsMarket[] {
  const chosen: RawPerpsMarket[] = []
  const seen = new Set<number>()
  const add = (m: RawPerpsMarket | undefined) => {
    if (!m || seen.has(m.market) || chosen.length >= MAX_FUNDING_MARKETS) return
    seen.add(m.market)
    chosen.push(m)
  }
  // Core majors first so BTC/ETH/SOL funding is always charted.
  for (const sym of CORE_FUNDING_SYMBOLS) {
    add(markets.find((m) => m.symbol === sym))
  }
  // Then remaining markets ranked by open interest and 24h volume.
  const active = [...markets]
    .filter((m) => m.long_lots + m.short_lots > 0 || (m.volume_24h ?? 0) > 0)
    .sort((a, b) => {
      const oiA = (a.long_lots + a.short_lots) * a.mark_price
      const oiB = (b.long_lots + b.short_lots) * b.mark_price
      if (oiB !== oiA) return oiB - oiA
      return (b.volume_24h ?? 0) - (a.volume_24h ?? 0)
    })
  for (const m of active) add(m)
  return chosen
}

export async function fetchPerps(
  get: GetJson,
  rpcUrl: string | null,
): Promise<PerpsData> {
  const [info, stats, markets, health] = await Promise.all([
    get<RawPerpsInfo>('/v1/info'),
    get<RawPerpsStats>('/v1/stats'),
    get<RawPerpsMarket[]>('/v1/markets'),
    get<RawPerpsHealth>('/health').catch(() => null),
  ])

  const tracked = selectFundingMarkets(markets)
  const [fundingEntries, onChainAccount] = await Promise.all([
    Promise.all(
      tracked.map(async (m): Promise<[number, RawPerpsFundingReading[]]> => {
        const readings = await get<RawPerpsFundingReading[]>(
          `/v1/funding?market=${m.market}&limit=${FUNDING_LIMIT}`,
        ).catch(() => [])
        return [m.market, readings]
      }),
    ),
    rpcUrl
      ? readAccounts(rpcUrl, [info.exchange])
          .then(([acc]) => acc ?? null)
          .catch((err: unknown) => {
            console.error('snapshot: perps exchange on-chain read failed', err)
            return null
          })
      : Promise.resolve(null),
  ])

  return {
    info,
    stats,
    markets,
    health,
    fundingByMarket: Object.fromEntries(fundingEntries),
    onChainAccount,
  }
}

/** Decodes the 168-byte `#[repr(C)]` on-chain `Exchange` account.
 * Verifies owner, discriminator (`PXEXCHNG`), and collateral mint; throws on mismatch. */
export function decodePerpsExchange(
  account: ChainAccount,
  expectedProgram: string,
  expectedMint: string,
  collateralDecimals: number,
  now: Date,
): PerpsOnChain {
  if (account.owner !== expectedProgram) {
    throw new Error(`perps exchange: owned by ${account.owner}, expected ${expectedProgram}`)
  }
  if (account.data.length !== EXCHANGE_ACCOUNT_LEN) {
    throw new Error(`perps exchange: length ${account.data.length}, expected ${EXCHANGE_ACCOUNT_LEN}`)
  }
  const disc = account.data.subarray(0, 8).toString('latin1')
  if (disc !== EXCHANGE_DISCRIMINATOR) {
    throw new Error(`perps exchange: discriminator ${disc}, expected ${EXCHANGE_DISCRIMINATOR}`)
  }
  // Layout (`perps/program/src/state.rs`):
  //   0..8     discriminator
  //   8..40    id (Pubkey)
  //   40..72   admin (Pubkey)
  //   72..104  operator (Pubkey)
  //   104..136 collateral_mint (Pubkey)
  //   136..144 settle_seq (u64 LE)
  //   144..152 total_balance (u64 LE)
  //   152..160 withdraw_delay_s (i64 LE)
  //   160      paused (u8)
  const mint = account.data.subarray(104, 136).toString('hex')
  if (mint !== expectedMint) {
    throw new Error(`perps exchange: collateral mint ${mint}, expected ${expectedMint}`)
  }
  const settle_seq = Number(account.data.readBigUInt64LE(136))
  const totalBalanceAtoms = Number(account.data.readBigUInt64LE(144))
  const withdraw_delay_s = Number(account.data.readBigInt64LE(152))
  const paused = account.data.readUInt8(160) !== 0
  const unit = 10 ** collateralDecimals
  return {
    read_at: now.toISOString(),
    total_balance_usd: totalBalanceAtoms / unit,
    settle_seq,
    withdraw_delay_s,
    paused,
  }
}

const baseSymbolOf = (symbol: string): string =>
  symbol.endsWith('-PERP') ? symbol.slice(0, -'-PERP'.length) : symbol

/** Pure assembly of `PerpsSnapshot` from upstream payloads. */
export function buildPerps(
  data: PerpsData,
  symbolOf: (mint: string) => string,
  now: Date,
): PerpsSnapshot {
  const { info, stats, health } = data
  const unit = 10 ** info.collateral_decimals
  const usd = (atoms: number) => atoms / unit
  const priceUsd = (atomsPerLot: number, lotsPerUnit: number) => (atomsPerLot * lotsPerUnit) / unit

  let onChain: PerpsOnChain | null = null
  if (data.onChainAccount) {
    try {
      onChain = decodePerpsExchange(
        data.onChainAccount,
        info.program,
        info.mint,
        info.collateral_decimals,
        now,
      )
    } catch (err) {
      console.error('snapshot: perps exchange account failed validation', err)
      onChain = null
    }
  }

  let longOiTotal = 0
  let shortOiTotal = 0
  let volumeTotal = 0
  let anyVolumeReported = false
  let marketsPriced = 0
  let marketsQuoted = 0
  let marketsWithOi = 0
  let marketsWithVolume = 0
  let cryptoMarkets = 0
  let tradfiMarkets = 0
  let cryptoVol = 0
  let tradfiVol = 0
  let cryptoOi = 0
  let tradfiOi = 0

  const markets: PerpsMarket[] = data.markets.map((m) => {
    const base = baseSymbolOf(m.symbol)
    const cls = perpsMarketClass(base)
    const underlying = perpsUnderlying(base)
    const indexUsd = priceUsd(m.index_price, m.lots_per_unit)
    const markUsd = priceUsd(m.mark_price, m.lots_per_unit)
    const top = m.levels[0]
    const deepest = m.levels[m.levels.length - 1]
    const bidUsd = top ? priceUsd(top.bid, m.lots_per_unit) : null
    const askUsd = top ? priceUsd(top.ask, m.lots_per_unit) : null
    const mid = bidUsd !== null && askUsd !== null ? (bidUsd + askUsd) / 2 : 0
    const spreadBps = bidUsd !== null && askUsd !== null && mid > 0 ? ((askUsd - bidUsd) / mid) * 10_000 : null
    const quotedDepthUsd = deepest ? usd(deepest.max_lots * m.mark_price) : null

    const longOiUsd = usd(m.long_lots * m.mark_price)
    const shortOiUsd = usd(m.short_lots * m.mark_price)
    const openInterestUsd = longOiUsd + shortOiUsd
    const volume24hUsd = m.volume_24h != null ? usd(m.volume_24h) : null

    const open24hUsd = m.open_24h != null && m.open_24h > 0 ? priceUsd(m.open_24h, m.lots_per_unit) : null
    const change24hPct = open24hUsd !== null && indexUsd > 0 ? ((indexUsd - open24hUsd) / open24hUsd) * 100 : null
    const high24hUsd = m.high_24h != null && m.high_24h > 0 ? priceUsd(m.high_24h, m.lots_per_unit) : null
    const low24hUsd = m.low_24h != null && m.low_24h > 0 ? priceUsd(m.low_24h, m.lots_per_unit) : null

    const frHrPct = m.funding_rate_ppm_per_hour / 10_000
    const initialMarginPct = m.initial_margin_ppm / 10_000
    const maintenanceMarginPct = m.maintenance_margin_ppm / 10_000
    // Floor to 2 decimals, matching `maxLeverageHundredths` in `arch-prime` SDK.
    const maxLeverage = m.initial_margin_ppm > 0 ? Math.floor((1_000_000 * 100) / m.initial_margin_ppm) / 100 : 0

    if (m.mark_price > 0) marketsPriced++
    if (m.levels.length > 0) marketsQuoted++
    if (openInterestUsd > 0) marketsWithOi++
    if (volume24hUsd !== null) {
      anyVolumeReported = true
      volumeTotal += volume24hUsd
      if (volume24hUsd > 0) marketsWithVolume++
    }
    longOiTotal += longOiUsd
    shortOiTotal += shortOiUsd

    if (cls === 'crypto') {
      cryptoMarkets++
      cryptoOi += openInterestUsd
      if (volume24hUsd !== null) cryptoVol += volume24hUsd
    } else if (cls === 'tradfi') {
      tradfiMarkets++
      tradfiOi += openInterestUsd
      if (volume24hUsd !== null) tradfiVol += volume24hUsd
    }

    return {
      id: m.market,
      symbol: m.symbol,
      base_symbol: base,
      market_class: cls,
      underlying,
      index_price_usd: indexUsd,
      mark_price_usd: markUsd,
      mark_at: new Date(m.mark_at_ms).toISOString(),
      change_24h_pct: change24hPct,
      high_24h_usd: high24hUsd,
      low_24h_usd: low24hUsd,
      bid_usd: bidUsd,
      ask_usd: askUsd,
      spread_bps: spreadBps,
      quoted_depth_usd: quotedDepthUsd,
      funding_rate_hr_pct: frHrPct,
      funding_rate_8h_pct: frHrPct * 8,
      funding_rate_apr_pct: frHrPct * HOURS_PER_YEAR,
      long_units: m.lots_per_unit > 0 ? m.long_lots / m.lots_per_unit : 0,
      short_units: m.lots_per_unit > 0 ? m.short_lots / m.lots_per_unit : 0,
      long_oi_usd: longOiUsd,
      short_oi_usd: shortOiUsd,
      open_interest_usd: openInterestUsd,
      net_skew_usd: longOiUsd - shortOiUsd,
      volume_24h_usd: volume24hUsd,
      initial_margin_pct: initialMarginPct,
      maintenance_margin_pct: maintenanceMarginPct,
      max_leverage: maxLeverage,
      taker_fee_bps: (m.taker_fee_ppm ?? 0) / 100,
      liquidation_fee_bps: (m.liquidation_fee_ppm ?? 0) / 100,
      max_order_usd: usd(m.max_order_lots * m.mark_price),
      max_position_usd: usd(m.max_position_lots * m.mark_price),
      split: m.split
        ? {
            close_at: new Date(m.split.close_at_ms).toISOString(),
            reopen_at: new Date(m.split.reopen_at_ms).toISOString(),
            shares_after: m.split.shares_after,
            shares_before: m.split.shares_before,
            closed: m.split.closed,
          }
        : null,
    }
  })

  // Sort: highest 24h volume first, then highest open interest, then market id.
  markets.sort((a, b) => {
    const volDiff = (b.volume_24h_usd ?? -1) - (a.volume_24h_usd ?? -1)
    if (volDiff !== 0) return volDiff
    if (b.open_interest_usd !== a.open_interest_usd) return b.open_interest_usd - a.open_interest_usd
    return a.id - b.id
  })

  const marketById = new Map(markets.map((m) => [m.id, m]))
  const funding_history: PerpsFundingSeries[] = Object.entries(data.fundingByMarket)
    .map(([idStr, readings]) => {
      const m = marketById.get(Number(idStr))
      if (!m || readings.length === 0) return null
      return {
        market_id: m.id,
        symbol: m.symbol,
        current_hr_pct: m.funding_rate_hr_pct,
        current_apr_pct: m.funding_rate_apr_pct,
        points: readings.map((r) => {
          const hr = r.r / 10_000
          return {
            time: new Date(r.t).toISOString(),
            rate_hr_pct: hr,
            rate_apr_pct: hr * HOURS_PER_YEAR,
          }
        }),
      }
    })
    .filter((s): s is PerpsFundingSeries => s !== null)
    .sort((a, b) => a.market_id - b.market_id)

  return {
    read_at: now.toISOString(),
    network: info.network,
    exchange: info.exchange,
    program: info.program,
    collateral_mint: info.mint,
    collateral_symbol: symbolOf(info.mint),
    collateral_decimals: info.collateral_decimals,
    operator: info.operator,
    maker: info.maker,
    build_sha: health?.build_sha ?? null,
    halted: stats.halted ?? health?.halted ?? null,
    settle_seq: stats.settle_seq,
    gross_open_interest_usd: usd(stats.gross_notional),
    long_open_interest_usd: longOiTotal,
    short_open_interest_usd: shortOiTotal,
    net_notional_usd: usd(stats.net_notional),
    maker_equity_usd: usd(stats.maker_equity),
    maker_requirement_usd: usd(stats.maker_requirement),
    unnetted_requirement_usd: usd(stats.unnetted_requirement),
    insurance_fund_usd: usd(stats.insurance_fund),
    fees_collected_usd: usd(stats.fees_collected),
    volume_24h_usd: anyVolumeReported ? volumeTotal : null,
    accounts: stats.accounts,
    open_orders: stats.open_orders,
    markets_total: markets.length,
    markets_priced: health?.markets_priced ?? marketsPriced,
    markets_quoted: health?.markets_quoted ?? marketsQuoted,
    markets_with_oi: marketsWithOi,
    markets_with_volume_24h: marketsWithVolume,
    crypto_markets: cryptoMarkets,
    tradfi_markets: tradfiMarkets,
    crypto_volume_24h_usd: cryptoVol,
    tradfi_volume_24h_usd: tradfiVol,
    crypto_oi_usd: cryptoOi,
    tradfi_oi_usd: tradfiOi,
    on_chain: onChain,
    markets,
    funding_history,
  }
}
