import type { Pool, Vault } from '../src/data/snapshot.js'
import type { AnalyticsData } from './analytics.js'
import type { SymbolOf } from './lend.js'
import { num, numOrNull } from './series.js'

// Arch Swap pools and the vaults, as analytics lists them now.

export function buildPools(a: AnalyticsData, symbolOf: SymbolOf): Pool[] {
  return a.pools.map((p) => ({
    address: p.address,
    pair: `${symbolOf(p.mint_a)}/${symbolOf(p.mint_b)}`,
    tvl_usd: num(p.tvl_usd),
    volume_24h_usd: num(p.volume_24h_usd),
    volume_7d_usd: num(p.volume_7d_usd),
    volume_30d_usd: num(p.volume_30d_usd),
    swaps_24h: p.swaps_24h ?? 0,
    fees_24h_usd: num(p.fees_24h_usd),
    fee_apr_pct: p.fee_apr === null ? null : p.fee_apr * 100,
  }))
}

export function buildVaults(a: AnalyticsData, symbolOf: SymbolOf): Vault[] {
  return a.vaults.map((v) => ({
    address: v.address,
    share_mint: v.share_mint,
    share_symbol: symbolOf(v.share_mint),
    asset_symbol: symbolOf(v.asset_mint),
    total_assets: numOrNull(v.total_assets),
    share_supply: numOrNull(v.share_supply),
    nav_per_share: numOrNull(v.nav_per_share),
    assets_usd: numOrNull(v.tvl_usd),
    deposits_24h_usd: num(v.deposits_24h_usd),
    redemptions_24h_usd: num(v.redemptions_24h_usd),
  }))
}
