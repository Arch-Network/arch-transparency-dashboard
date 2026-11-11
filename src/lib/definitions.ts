import type { EmodePairing, Snapshot } from '../data/snapshot'
import { fmtPct, fmtUsd } from './format'

// Definitions of the live metrics, worded to match how each number is
// computed upstream. The launch-spec copy for modules that are not live yet
// stays in `tooltips.ts`.

/** Definitions that hold whatever analytics build the dashboard reads. */
export const definitions = {
  swapFees:
    'Fees paid by traders on Arch Swap pools, before the split between liquidity providers and the protocol. PropAMM fills are not pool trades and add nothing here.',
  utilization:
    'Borrowed amount divided by supplied amount. Rate and utilization history shows each day’s time-weighted average. Utilization is averaged over the part of the day the market held deposits, so on the day of a market’s first deposit it covers only the time after that deposit, while the rates beside it also count the earlier hours, when they were zero. A day on which the market held no deposits at all has no utilization, and the line is left blank there.',
  availableLiquidity:
    'Supplied funds not currently borrowed. They can be withdrawn, or borrowed where the market allows borrowing.',
  loansIssued: 'USD value of every borrow from Arch Lend, priced when it was drawn.',
  badDebt: 'Debt written off through bankruptcies, where an account’s collateral did not cover what it owed.',
  riskWeights:
    'Arch Lend is cross-margin. A deposit counts toward borrowing power at its collateral weight, and a debt counts against it at its liability weight. Initial weights apply when borrowing or withdrawing. An account can be liquidated once its debts at maintenance weights reach its deposits at maintenance weights.',
  emodeWeights:
    'The table shows each market’s base weights. The program sets a higher collateral weight for two pairings (e-mode), which the table does not show. As read from the chain on 11 November 2026: primeBTC counts at 0.88 / 0.92 for an account whose only debt is aBTC (borrowing up to 70.4%, liquidation from 83.6%), and primeUSD at 1.00 / 1.00 for an account whose only debt is aUSD (up to 80.0%, liquidation from 90.9%).',
  emodeRule:
    'The program sets a higher collateral weight for some pairings of collateral and debt (e-mode). It applies only while every debt in the account is in a market that grants that collateral the higher weight; where more than one does, the lowest applies.',
  liquidationBuffer:
    'How far the value of an account’s collateral can fall, with its debt unchanged, before the account can be liquidated: its deposits at maintenance weights less its debts at maintenance weights, as a share of those deposits. Computed by Arch Prime Analytics at its reference prices, which can differ slightly from the oracle prices the program liquidates at.',
  vaultAssets:
    'What each vault records as its total assets: the tokens in its reserve account on Arch plus the balance it records as deployed by its manager. The second part cannot be read from a token account, so a vault’s assets can exceed its reserve balance.',
  blockTime: 'Twenty-four hours divided by the number of blocks produced in them.',
  tps:
    'Transactions per second on Arch over the last 24 hours, from the Arch Explorer. The average is the transactions in those 24 hours divided by the seconds in them. The peak is the busiest single minute of the same 24 hours, expressed per second and rounded up to a whole number by the explorer.',
  ausdSupply: 'aUSD in existence on Arch, from the token’s mint.',
  ausdTransfers:
    'aUSD transfers as recorded by the Arch Explorer: the number of transfers and the amount moved, all-time and for each UTC day on the chart. The explorer does not record some transfers made inside multi-step transactions, so the true figures are somewhat higher. Measured on 11 November 2026 by comparing the balances the recorded transfers add up to with the balances on chain: at least 16 transfers moving 2,138.09 aUSD were missing, beside 2,651 recorded transfers moving 163,997.77 aUSD.',
} as const

/** What the page says about e-mode beside the base weights. From the
 * snapshot's pairings where the analytics build serves them; the dated
 * reading where it does not. `listed`: the pairings are in a table beside the
 * text, which then does not repeat them. */
export function emodeDefinition(pairings: EmodePairing[] | null, listed = false): string {
  if (pairings === null) return definitions.emodeWeights
  const base = 'The table shows each market’s base weights.'
  if (pairings.length === 0)
    return `${base} The program can set a higher collateral weight for a pairing of collateral and debt (e-mode); none is set now.`
  if (listed) return `The first table shows each market’s base weights. ${definitions.emodeRule}`
  const each = pairings.map(
    (p) =>
      `${p.collateral} counts at ${p.asset_weight_init.toFixed(2)} / ${p.asset_weight_maint.toFixed(2)} against ${p.debt} debt (borrowing up to ${fmtPct(p.max_ltv_pct)}, liquidation from ${fmtPct(p.liquidation_ltv_pct)})`,
  )
  return `${base} ${definitions.emodeRule} Now: ${each.join('; ')}.`
}

/** Definitions whose wording follows what the analytics build behind this
 * snapshot serves, so each describes the number actually on the page. */
export function liveDefinitions({ overview, lend }: Snapshot) {
  const leftOut = overview.tvl_left_out
  const leftOutUsd = leftOut.reduce((total, m) => total + (m.available_usd ?? 0), 0)
  const unreferenced = lend.markets.filter((m) => m.price?.source === 'oracle').map((m) => m.symbol)
  return {
    tvl:
      'USD value of assets held in Arch Prime: Swap pool reserves, liquidity available to borrow in Arch Lend, and assets held by vaults. Each asset is counted once: borrowed funds are not counted, and vault shares supplied to Arch Lend count in the vault’s assets only. ' +
      (overview.tvl_method === 'protocol'
        ? 'Each day on the chart is that day’s closing balances; the last point is now. Not included: the market maker’s PropAMM inventory, and deposits of a token Arch Prime Analytics has no reference price for' +
          (leftOut.length > 0
            ? ` (now ${leftOut.map((m) => m.symbol).join(' and ')}, ${fmtUsd(leftOutUsd)} at the Arch Lend oracle price).`
            : '.')
        : 'On the chart, Swap and vault values are each day’s close and Arch Lend liquidity is the day’s average; the last point is now. A token with no reference price is counted at its Arch Lend oracle price. The market maker’s PropAMM inventory is not included.'),
    volume:
      overview.propamm_volume_cum_usd !== null
        ? 'USD value of trades on Arch, from two venues shown separately: swaps in Arch Swap pools, and fills by the PropAMM market maker, including purchases it settles by minting from the treasury. Each trade is counted once, at the hourly price of the token paid in, or of the token received where the one paid in has no reference price. Moving the market maker’s inventory in or out is not a trade and is not counted.'
        : 'USD value of swaps in Arch Swap pools, each at the hourly price of the token paid in. Fills by the PropAMM market maker are not included: the analytics build this page reads does not serve them yet.',
    lenderInterest:
      overview.lender_interest_method === 'credited'
        ? 'Interest credited to suppliers in Arch Lend. The program adds interest to a market’s supplied balance whenever the market is used (a deposit, withdrawal, borrow or repayment). Each amount is counted on the day it was added, at that day’s closing price, so a quiet market’s interest appears on the day of its next use. Credited to supplier balances, not a payout.'
        : 'Interest accrued to suppliers in Arch Lend, through the last complete UTC day. An estimate: each day is counted at its closing supply and supply rate. Through 10 November 2026 the estimate came to $2.27, against $2.35 the program had credited to suppliers by then: 3.3% low. Accrued to supplier balances, not a payout.',
    borrowers: lend.loan_book
      ? 'Arch Lend accounts that owe a debt now, and the number of wallets that own them. A wallet can hold several accounts. The all-time figure counts every account that has ever borrowed, including those that have since repaid.'
      : 'Arch Lend accounts that have ever borrowed, including those that have since repaid. A wallet can hold several accounts, so this is not a count of people.',
    pricing:
      'aUSD is valued at $1. aBTC is valued at the Coinbase BTC-USD price: the running close of the current hour’s candle, which Arch Prime Analytics re-reads every few seconds and this page picks up on its next refresh, and each past hour’s close for history. Vault shares are valued at the vault’s net asset value per share. ' +
      (unreferenced.length > 0
        ? `${unreferenced.join(' and ')} ${unreferenced.length > 1 ? 'have' : 'has'} no reference price in Arch Prime Analytics: in the markets table ${unreferenced.length > 1 ? 'they are' : 'it is'} valued at the Arch Lend oracle price, averaged over the current hour` +
          (overview.tvl_method === 'protocol' ? ', and left out of TVL. ' : ', and counted in TVL at that price. ')
        : '') +
      'The markets table on the Risk tab shows the price each market is valued at, its source and its time.',
  }
}

export interface DefinitionEntry {
  term: string
  definition: string
}

export function definitionEntries(snapshot: Snapshot): DefinitionEntry[] {
  const live = liveDefinitions(snapshot)
  const { overview, lend } = snapshot
  return [
    { term: 'Total Value Locked (TVL)', definition: live.tvl },
    { term: overview.propamm_volume_cum_usd !== null ? 'Trading Volume' : 'Pool Swap Volume', definition: live.volume },
    { term: 'Swap Fees', definition: definitions.swapFees },
    { term: 'Interest Earned by Lenders', definition: live.lenderInterest },
    { term: 'Utilization', definition: definitions.utilization },
    { term: 'Available Liquidity', definition: definitions.availableLiquidity },
    { term: lend.loan_book ? 'Accounts in Debt' : 'Borrowing Accounts', definition: live.borrowers },
    ...(lend.loan_book ? [{ term: 'Liquidation Buffer', definition: definitions.liquidationBuffer }] : []),
    { term: 'Borrowed to Date', definition: definitions.loansIssued },
    { term: 'Bad Debt', definition: definitions.badDebt },
    { term: 'Collateral and Liability Weights', definition: `${definitions.riskWeights} ${emodeDefinition(lend.emode_pairings)}` },
    { term: 'Vault Assets', definition: definitions.vaultAssets },
    { term: 'Average Block Time', definition: definitions.blockTime },
    { term: 'Transactions per Second (TPS)', definition: definitions.tps },
    { term: 'aUSD Supply', definition: definitions.ausdSupply },
    { term: 'aUSD Transfers', definition: definitions.ausdTransfers },
    { term: 'Prices', definition: live.pricing },
  ]
}
