// What a withdrawal of part of a market's deposits would leave behind, the
// debt unchanged. Arithmetic on the figures the page already shows.

export interface AfterWithdrawal {
  /** Borrowed over what would remain supplied. */
  utilization_pct: number
  /** The part of the request beyond what is available now: it cannot leave
   * until borrowers repay. Zero when the request can be met in full. */
  unmet_usd: number
}

export function afterWithdrawal(suppliedUsd: number, borrowedUsd: number, sharePct: number): AfterWithdrawal {
  const asked = suppliedUsd * (sharePct / 100)
  const withdrawn = Math.min(asked, suppliedUsd - borrowedUsd)
  const remaining = suppliedUsd - withdrawn
  return {
    utilization_pct: remaining > 0 ? (borrowedUsd / remaining) * 100 : 0,
    unmet_usd: asked - withdrawn,
  }
}
