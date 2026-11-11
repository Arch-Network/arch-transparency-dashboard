import type { EmodePairing, Snapshot } from '../data/snapshot'
import { fmtPct, fmtUsd } from './format'

// Definitions of the live metrics, worded to match how each number is
// computed upstream, in two layers. `short` sits beside the number: what it
// is, what it leaves out, where it comes from. `long` is the full account, on
// the Methodology page under the anchor `id`. The launch-spec copy for
// modules that are not live yet stays in `tooltips.ts`.

export interface Definition {
  /** The anchor on the Methodology page. */
  id: string
  term: string
  short: string
  long: string
}

/** Definitions that hold whatever analytics build the dashboard reads. */
export const definitions = {
  swapFees: {
    id: 'swap-fees',
    term: 'Swap fees',
    short: 'Fees traders paid in Arch Swap pools, before the split between liquidity providers and the protocol. PropAMM fills are not pool trades and add nothing here.',
    long: 'Fees paid by traders on Arch Swap pools, before the split between liquidity providers and the protocol. PropAMM fills are not pool trades and add nothing here.',
  },
  utilization: {
    id: 'utilization',
    term: 'Utilization',
    short: 'Borrowed divided by supplied. History shows each day’s time-weighted average.',
    long: 'Borrowed amount divided by supplied amount. Rate and utilization history shows each day’s time-weighted average. Utilization is averaged over the part of the day the market held deposits, so on the day of a market’s first deposit it covers only the time after that deposit, while the rates beside it also count the earlier hours, when they were zero. A day on which the market held no deposits at all has no utilization, and the line is left blank there.',
  },
  availableLiquidity: {
    id: 'available-liquidity',
    term: 'Available liquidity',
    short: 'Supplied funds not currently borrowed: what can be withdrawn, or borrowed where the market allows it.',
    long: 'Supplied funds not currently borrowed. They can be withdrawn, or borrowed where the market allows borrowing.',
  },
  debt: {
    id: 'debt-outstanding',
    term: 'Debt outstanding',
    short: 'What Arch Lend accounts owe now, in USD, across the markets with a price. The change compares this hour with the same hour a day earlier.',
    long: 'USD value of everything borrowed from Arch Lend and not yet repaid, summed over the markets that have a price. The 24-hour change compares the debt in the current hour with the debt in the same hour a day earlier, each taken as the hour’s average, over the markets that carry debt now. Debt in aBTC is valued at the BTC price of its hour, so the change includes the price move as well as borrowing and repayment.',
  },
  netFlows: {
    id: 'net-flows',
    term: 'Net flows, last 24 hours',
    short: 'Deposits less withdrawals over the last 24 hours. Net, because one transaction can move the same funds in and out.',
    long: 'For Arch Lend: deposits less withdrawals, and borrows less repayments, over the last 24 hours, each priced when it happened. For vaults: deposits less redemptions over the same period. The figures are net because gross flows overstate activity: a single transaction can deposit and withdraw, or borrow and repay, the same funds. A market whose token has no reference price has no USD flow and is left out.',
  },
  loansIssued: {
    id: 'borrowed-to-date',
    term: 'Borrowed to date',
    short: 'USD value of every borrow from Arch Lend, priced when it was drawn.',
    long: 'USD value of every borrow from Arch Lend, priced when it was drawn.',
  },
  badDebt: {
    id: 'bad-debt',
    term: 'Bad debt',
    short: 'Debt written off through bankruptcies, where an account’s collateral did not cover what it owed.',
    long: 'Debt written off through bankruptcies, where an account’s collateral did not cover what it owed.',
  },
  riskWeights: {
    id: 'risk-weights',
    term: 'Collateral and liability weights',
    short: 'A deposit counts toward borrowing power at its collateral weight; a debt counts against it at its liability weight. Liquidation is judged at maintenance weights.',
    long: 'Arch Lend is cross-margin. A deposit counts toward borrowing power at its collateral weight, and a debt counts against it at its liability weight. Initial weights apply when borrowing or withdrawing. An account can be liquidated once its debts at maintenance weights reach its deposits at maintenance weights.',
  },
  liquidationBuffer: {
    id: 'liquidation-buffer',
    term: 'Liquidation buffer',
    short: 'How far the value of an account’s collateral can fall, its debt unchanged, before it can be liquidated. At Arch Prime Analytics’ reference prices, not the program’s oracle.',
    long: 'How far the value of an account’s collateral can fall, with its debt unchanged, before the account can be liquidated: its deposits at maintenance weights less its debts at maintenance weights, as a share of those deposits. Computed by Arch Prime Analytics at its reference prices, which can differ slightly from the oracle prices the program liquidates at.',
  },
  concentration: {
    id: 'borrower-concentration',
    term: 'Largest borrower’s share of debt',
    short: 'The debt of the wallet that owes the most, its accounts taken together, as a share of all debt in Arch Lend. The wallet is not named.',
    long: 'The debt of the wallet that owes the most, as a share of everything owed in Arch Lend now. A wallet can hold several lending accounts; they are added together. Debt in a token with no reference price is not counted. The wallet is not named here. Beside it, the page shows what the accounts in debt owe and what they hold on deposit, by token, at reference prices: all their deposits, whether or not the program counts them as collateral.',
  },
  stress: {
    id: 'btc-stress',
    term: 'BTC price stress test',
    short: 'The debt in accounts that could be liquidated after a move in the BTC price, with nothing else changing. A calculation on today’s loan book, not a forecast.',
    long: 'For each move in the BTC price, the debt of the accounts that could then be liquidated. Each account is taken whole, as the program judges it: all its deposits at their maintenance collateral weights against all its debts at their maintenance liability weights, with the weights the program applies to that account, e-mode included. It can be liquidated once the weighted debts reach the weighted deposits. The assumptions: aBTC and primeBTC move one for one with BTC; aUSD and primeUSD stay at $1; values are at Arch Prime Analytics’ reference prices, not the program’s oracle, which applies a price bias against the account, so the results are slightly optimistic; and the loan book is held still, with no repayment, no new borrowing, no interest and no liquidation setting off another. Moves run both ways because aBTC is borrowed as well as deposited: a rise increases what those accounts owe. Debt is shown at today’s prices in every row. An account with no health reading is not rated and is in no row; its debt is reported beside the table. The test is published only while its unmoved case comes out exactly as the loan book’s own verdicts.',
  },
  withdrawal: {
    id: 'liquidity-after-withdrawal',
    term: 'Liquidity after a withdrawal',
    short: 'Utilization if depositors withdrew a stated share of a market’s deposits, the debt unchanged. Only what is not borrowed can leave.',
    long: 'What a market’s utilization would be if depositors withdrew a stated share of its deposits and the debt stayed as it is: borrowed, divided by what would remain supplied. Only funds that are not borrowed can be withdrawn, so a request larger than the available liquidity is met in part, utilization reaches 100%, and the rest waits until borrowers repay. Arithmetic on the supplied and borrowed figures shown; it says nothing about how likely such a withdrawal is. Above a market’s optimal utilization its borrow rate rises steeply, which is meant to draw repayments and new deposits.',
  },
  oracle: {
    id: 'oracle',
    term: 'Oracle and maximum age',
    short: 'The price source the Arch Lend program is configured with for a market, and the oldest price it accepts from it.',
    long: 'Each Arch Lend market is configured with a price source (its oracle) and a maximum age. The program values the market’s deposits and debts at that oracle, and refuses a price older than the maximum age. Both are read from the market’s configuration on chain. This page values balances at Arch Prime Analytics’ reference prices instead, and names the oracle so the two can be told apart.',
  },
  vaultAssets: {
    id: 'vault-assets',
    term: 'Vault assets',
    short: 'What the vault records as its total assets: its reserve on Arch plus the balance it records as deployed by its manager.',
    long: 'What each vault records as its total assets: the tokens in its reserve account on Arch plus the balance it records as deployed by its manager. The second part cannot be read from a token account, so a vault’s assets can exceed its reserve balance.',
  },
  navPerShare: {
    id: 'nav-per-share',
    term: 'NAV per share',
    short: 'The vault’s assets per share, by the vault program’s own conversion. Vault shares are valued at it.',
    long: 'A vault’s net asset value per share: its recorded assets divided by its shares, by the vault program’s own conversion. Shares of a vault supplied to Arch Lend are valued at it.',
  },
  feeApr: {
    id: 'fee-apr',
    term: 'Fee APR',
    short: 'The pool’s last 24 hours of swap fees, annualized, over its reserves. A reading of one day, not a forecast.',
    long: 'A pool’s swap fees over the last 24 hours, multiplied up to a year and divided by the value of its reserves, as Arch Prime Analytics serves it. Fees are gross, before the split between liquidity providers and the protocol, and one day’s fees say little about the next.',
  },
  programTransactions: {
    id: 'program-transactions',
    term: 'Arch Prime program transactions',
    short: 'Transactions naming each program in the explorer’s last 24 hourly buckets. One calling two programs counts under both, so the rows do not add up.',
    long: 'The number of Arch transactions that named each Arch Prime program, from the Arch Explorer, over its last 24 hourly buckets: the current hour so far and the 23 before it, so between 23 and 24 hours. A transaction that calls two programs counts under both, so the rows are not parts of a total. They are a small share of all transactions on Arch, which the network figures beside them count.',
  },
  blockTime: {
    id: 'block-time',
    term: 'Average block time',
    short: 'Twenty-four hours divided by the number of blocks produced in them.',
    long: 'Twenty-four hours divided by the number of blocks produced in them.',
  },
  tps: {
    id: 'tps',
    term: 'Transactions per second (TPS)',
    short: 'Transactions in the last 24 hours divided by the seconds in them. The peak is the busiest minute. From the Arch Explorer.',
    long: 'Transactions per second on Arch over the last 24 hours, from the Arch Explorer. The average is the transactions in those 24 hours divided by the seconds in them. The peak is the busiest single minute of the same 24 hours, expressed per second and rounded up to a whole number by the explorer.',
  },
  ausdSupply: {
    id: 'ausd-supply',
    term: 'aUSD supply',
    short: 'aUSD in existence on Arch, from the token’s mint.',
    long: 'aUSD in existence on Arch, from the token’s mint.',
  },
  tokenAccounts: {
    id: 'token-accounts',
    term: 'Token accounts',
    short: 'Token accounts holding a balance, as the Arch Explorer counts them. A wallet can have several and a program can hold one: not a count of people.',
    long: 'The number of token accounts holding a balance of the token, as the Arch Explorer counts them. A token account belongs to an owner, which can be a wallet or a program; one wallet can have several, and the accounts that hold a market’s or a pool’s funds are counted too. It is not a count of people or of wallets.',
  },
  ausdValuation: {
    id: 'ausd-valuation',
    term: 'aUSD valuation',
    short: 'Every aUSD figure on this page counts 1 aUSD as $1.00: an assumption, not an observed price. The Arch Lend oracle’s reading is shown beside it; it tracks USDC, not aUSD.',
    long: 'This page counts 1 aUSD as $1.00 wherever it gives a USD value, because Arch Prime Analytics’ reference price for aUSD is the constant 1. That is an assumption, not an observation. The one observed reading is the Arch Lend program’s own oracle for the aUSD market, the price the program lends and liquidates against: it is shown as its average over the latest hour it has a reading for, and nothing on this page is valued at it. That oracle reads a USDC/USD feed (the symbol its account carried when read on chain on 11 November 2026), so it follows the price of USDC, not of aUSD. Neither source serves a market price for aUSD, so none is shown.',
  },
  bridgeSettings: {
    id: 'bridge-settings',
    term: 'Bridge settings',
    short: 'Read from the bridge programs’ own accounts on Arch each time this page’s data is assembled, and shown with the time of that read.',
    long: 'The settings of the programs that issue aUSD and aBTC (redemption minimum and fee, deposit fee, pauses, whether a key that can mint without a deposit is set, the supply cap, the number of signers a deposit needs) are read from the programs’ own accounts on Arch, through the public Arch RPC, each time this page’s data is assembled, and are shown with the time of that read. If the read fails, or an account is not laid out as expected, the settings are left out rather than quoted from an earlier read. The supply breakdowns beside them are different: they were worked out once from on-chain records and carry the time of that reading, so they do not follow the supply.',
  },
  ausdTransfers: {
    id: 'ausd-transfers',
    term: 'aUSD transfers',
    short: 'Transfers as the Arch Explorer records them. It misses some made inside multi-step transactions, so the true figures are somewhat higher.',
    long: 'aUSD transfers as recorded by the Arch Explorer: the number of transfers and the amount moved, all-time and for each UTC day on the chart. The explorer does not record some transfers made inside multi-step transactions, so the true figures are somewhat higher. Measured on 11 November 2026 by comparing the balances the recorded transfers add up to with the balances on chain: at least 16 transfers moving 2,138.09 aUSD were missing, beside 2,651 recorded transfers moving 163,997.77 aUSD.',
  },
} as const satisfies Record<string, Definition>

/** The e-mode pairings as read from the chain on 11 November 2026, for an
 * analytics build that does not serve them. */
const EMODE_AS_READ =
  'The table shows each market’s base weights. The program sets a higher collateral weight for two pairings (e-mode), which the table does not show. As read from the chain on 11 November 2026: primeBTC counts at 0.88 / 0.92 for an account whose only debt is aBTC (borrowing up to 70.4%, liquidation from 83.6%), and primeUSD at 1.00 / 1.00 for an account whose only debt is aUSD (up to 80.0%, liquidation from 90.9%).'

const EMODE_RULE =
  'The program sets a higher collateral weight for some pairings of collateral and debt (e-mode). It applies only while every debt in the account is in a market that grants that collateral the higher weight; where more than one does, the lowest applies.'

/** What the page says about e-mode beside the base weights. From the
 * snapshot's pairings where the analytics build serves them; the dated
 * reading where it does not. `listed`: the pairings are in a table beside the
 * text, which then does not repeat them. */
export function emodeDefinition(pairings: EmodePairing[] | null, listed = false): string {
  if (pairings === null) return EMODE_AS_READ
  const base = 'The table shows each market’s base weights.'
  if (pairings.length === 0)
    return `${base} The program can set a higher collateral weight for a pairing of collateral and debt (e-mode); none is set now.`
  if (listed) return `The first table shows each market’s base weights. ${EMODE_RULE}`
  const each = pairings.map(
    (p) =>
      `${p.collateral} counts at ${p.asset_weight_init.toFixed(2)} / ${p.asset_weight_maint.toFixed(2)} against ${p.debt} debt (borrowing up to ${fmtPct(p.max_ltv_pct)}, liquidation from ${fmtPct(p.liquidation_ltv_pct)})`,
  )
  return `${base} ${EMODE_RULE} Now: ${each.join('; ')}.`
}

/** Why the market maker's inventory is not locked value. The figure is a
 * dated reading: analytics does not sample the inventory, so none is live. */
const PROPAMM_INVENTORY =
  'The PropAMM market maker’s inventory is not included, for three reasons. It is the maker’s own working inventory, not capital deposited by users. Arch Prime Analytics does not sample it, so it has no history to chart. And the maker itself holds primeBTC and primeUSD shares, so counting its inventory would count those vault assets twice. It was about $3,232 when read from the chain at 13:21 UTC on 11 November 2026.'

/** Definitions whose wording follows what the analytics build behind this
 * snapshot serves, so each describes the number actually on the page. */
export function liveDefinitions({ overview, lend }: Snapshot) {
  const leftOut = overview.tvl_left_out
  const leftOutUsd = leftOut.reduce((total, m) => total + (m.available_usd ?? 0), 0)
  const unreferenced = lend.markets.filter((m) => m.price?.source === 'oracle').map((m) => m.symbol)
  const withPropAmm = overview.propamm_volume_cum_usd !== null
  const credited = overview.lender_interest_method === 'credited'
  return {
    tvl: {
      id: 'tvl',
      term: 'Total value locked (TVL)',
      short:
        'Swap pool reserves, un-borrowed Arch Lend liquidity and vault assets, each asset counted once. Excludes the PropAMM market maker’s own inventory, which is not user deposits' +
        (overview.tvl_method === 'protocol' ? ', and tokens with no reference price.' : '.'),
      long:
        'USD value of assets held in Arch Prime: Swap pool reserves, liquidity available to borrow in Arch Lend, and assets held by vaults. Each asset is counted once: borrowed funds are not counted, and vault shares supplied to Arch Lend count in the vault’s assets only. ' +
        (overview.tvl_method === 'protocol'
          ? 'Each day on the chart is that day’s closing balances; the last point is now, on a day still open. Not included: deposits of a token Arch Prime Analytics has no reference price for' +
            (leftOut.length > 0
              ? ` (now ${leftOut.map((m) => m.symbol).join(' and ')}, ${fmtUsd(leftOutUsd)} at the Arch Lend oracle price).`
              : '.')
          : 'On the chart, Swap and vault values are each day’s close and Arch Lend liquidity is the day’s average; the last point is now. A token with no reference price is counted at its Arch Lend oracle price.') +
        ' The 24-hour change compares the latest hourly reading with the one 24 hours before it. ' +
        PROPAMM_INVENTORY,
    },
    volume: {
      id: 'volume',
      term: withPropAmm ? 'Trading volume' : 'Pool swap volume',
      short: withPropAmm
        ? 'USD value of swaps in Arch Swap pools and fills by the PropAMM market maker, each trade counted once. The headline is a rolling 24 hours; chart bars are UTC days.'
        : 'USD value of swaps in Arch Swap pools. PropAMM fills are not included. The headline is a rolling 24 hours; chart bars are UTC days.',
      long:
        (withPropAmm
          ? 'USD value of trades on Arch, from two venues shown separately: swaps in Arch Swap pools, and fills by the PropAMM market maker. The PropAMM settles some trades by having a treasury key mint the token the user receives. Each trade is counted once, at the hourly price of the token paid in, or of the token received where the one paid in has no reference price. Liquidity added to a pool or removed from it is not trading volume, and neither is the market maker moving its inventory in or out.'
          : 'USD value of swaps in Arch Swap pools, each at the hourly price of the token paid in. Liquidity added to a pool or removed from it is not trading volume. Fills by the PropAMM market maker are not included: the analytics build this page reads does not serve them yet.') +
        ' The headline figure covers the 24 hours up to the moment this page’s data was assembled, and is compared with the 24 hours before those. Bars on the chart are UTC days, so the last bar is today so far and is not comparable with a full day.',
    },
    lenderInterest: {
      id: 'lender-interest',
      term: 'Interest earned by lenders',
      short: credited
        ? 'Interest the program added to supplier balances in Arch Lend, counted on the day it was added. Credited to balances, not a payout.'
        : 'An estimate of interest accrued to suppliers in Arch Lend, through the last complete UTC day. Accrued to balances, not a payout.',
      long: credited
        ? 'Interest credited to suppliers in Arch Lend. The program adds interest to a market’s supplied balance whenever the market is used (a deposit, withdrawal, borrow or repayment). Each amount is counted on the day it was added, at that day’s closing price, so a quiet market’s interest appears on the day of its next use. Credited to supplier balances, not a payout.'
        : 'Interest accrued to suppliers in Arch Lend, through the last complete UTC day. An estimate: each day is counted at its closing supply and supply rate. Through 10 November 2026 the estimate came to $2.27, against $2.35 the program had credited to suppliers by then: 3.3% low. Accrued to supplier balances, not a payout.',
    },
    borrowers: {
      id: 'accounts-in-debt',
      term: lend.loan_book ? 'Accounts in debt' : 'Borrowing accounts',
      short: lend.loan_book
        ? 'Arch Lend accounts that owe a debt now. Accounts, not people: one wallet can hold several.'
        : 'Arch Lend accounts that have ever borrowed, repaid or not. Accounts, not people: one wallet can hold several.',
      long: lend.loan_book
        ? 'Arch Lend accounts that owe a debt now, and the number of wallets that own them. A wallet can hold several accounts. The all-time figure counts every account that has ever borrowed, including those that have since repaid. No history of the count is served, so it has no 24-hour comparison.'
        : 'Arch Lend accounts that have ever borrowed, including those that have since repaid. A wallet can hold several accounts, so this is not a count of people.',
    },
    pricing: {
      id: 'prices',
      term: 'Prices',
      short: 'aUSD at a fixed $1, aBTC at the Coinbase BTC-USD hourly price, vault shares at the vault’s net asset value per share.',
      long:
        'aUSD is valued at $1. aBTC is valued at the Coinbase BTC-USD price: the running close of the current hour’s candle, which Arch Prime Analytics re-reads every few seconds and this page picks up on its next refresh, and each past hour’s close for history. Vault shares are valued at the vault’s net asset value per share. ' +
        (unreferenced.length > 0
          ? `${unreferenced.join(' and ')} ${unreferenced.length > 1 ? 'have' : 'has'} no reference price in Arch Prime Analytics: in the markets table ${unreferenced.length > 1 ? 'they are' : 'it is'} valued at the Arch Lend oracle price, averaged over the current hour` +
            (overview.tvl_method === 'protocol' ? ', and left out of TVL. ' : ', and counted in TVL at that price. ')
          : '') +
        'The markets table on the Markets page shows the price each market is valued at, its source and its time.',
    },
  } satisfies Record<string, Definition>
}

/** Every definition on the Methodology page, in reading order. */
export function definitionEntries(snapshot: Snapshot): Definition[] {
  const live = liveDefinitions(snapshot)
  const { lend } = snapshot
  return [
    live.tvl,
    live.volume,
    definitions.swapFees,
    live.lenderInterest,
    definitions.debt,
    definitions.utilization,
    definitions.availableLiquidity,
    definitions.netFlows,
    live.borrowers,
    ...(lend.loan_book ? [definitions.liquidationBuffer, definitions.concentration] : []),
    ...(lend.loan_book?.stress ? [definitions.stress] : []),
    definitions.withdrawal,
    definitions.loansIssued,
    definitions.badDebt,
    { ...definitions.riskWeights, long: `${definitions.riskWeights.long} ${emodeDefinition(lend.emode_pairings)}` },
    definitions.oracle,
    definitions.vaultAssets,
    definitions.navPerShare,
    definitions.feeApr,
    definitions.programTransactions,
    definitions.blockTime,
    definitions.tps,
    definitions.ausdSupply,
    definitions.tokenAccounts,
    definitions.ausdValuation,
    definitions.ausdTransfers,
    definitions.bridgeSettings,
    live.pricing,
  ]
}
