import type { EmodePairing, Market } from '../src/data/snapshot.js'
import type { RawMarket } from './analytics.js'

// E-mode, as the Arch Lend program applies it: a bank carries a tag saying
// what it is as collateral, and entries naming the collateral tags it weighs
// higher when it is the bank borrowed. An entry replaces a base weight only
// where it is higher, and an isolated bank's deposits never count.

/** Every collateral and debt market the program pairs at more than the base
 * weights, in the order of `markets`. Null where no market carries e-mode
 * settings: the analytics build does not serve them, or has sampled none yet. */
export function emodePairings(raw: RawMarket[], markets: Market[]): EmodePairing[] | null {
  const settings = new Map(raw.flatMap((m) => (m.config.emode ? [[m.address, m.config.emode] as const] : [])))
  if (settings.size === 0) return null
  return markets.flatMap((collateral) => {
    const tag = settings.get(collateral.address)?.tag
    if (!tag || collateral.risk_tier === 'isolated') return []
    return markets.flatMap((debt) => {
      const entry = settings.get(debt.address)?.entries.find((e) => e.collateral_tag === tag)
      if (!entry) return []
      const init = Math.max(entry.asset_weight_init, collateral.asset_weight_init)
      const maint = Math.max(entry.asset_weight_maint, collateral.asset_weight_maint)
      if (init === collateral.asset_weight_init && maint === collateral.asset_weight_maint) return []
      return {
        collateral: collateral.symbol,
        debt: debt.symbol,
        asset_weight_init: init,
        asset_weight_maint: maint,
        max_ltv_pct: (init / debt.liability_weight_init) * 100,
        liquidation_ltv_pct: (maint / debt.liability_weight_maint) * 100,
      }
    })
  })
}
