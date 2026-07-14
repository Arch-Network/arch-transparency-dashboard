// Metric definitions — master spec §4, verbatim. Do not edit copy.
// Every tooltip ends with "Definitions: see Methodology." (rendered by InfoTooltip).

export const tooltips = {
  totalRevenue:
    'All fees accrued to the protocol across blockspace, trading, lending spread, liquidations, and partner revenue. Denominated in USD at time of accrual.',
  tvl:
    'USD value of all assets held in Arch protocol contracts: swap liquidity pools, lending deposits, and loan collateral. Collateral counted once.',
  lpYield:
    'Cumulative USD value paid out to liquidity providers on Arch Swap and lenders on Arch Lend. Excludes unrealized/accruing amounts.',
  aggregateLtv:
    'Total outstanding debt divided by total collateral value, weighted across all open loans.',
  distanceToLiquidation:
    "Liquidation threshold (86%) minus a loan's current LTV, in percentage points.",
  poolUtilization: 'Borrowed amount divided by total deposits in the lending pool.',
  blockspaceFees:
    'Transaction fees paid by users to the network, denominated in BTC, shown in USD at daily close.',
  reserveNav:
    'Net asset value of the off-chain stablecoin reserves backing ArchUSD, marked in real time and attested at the displayed timestamp.',
  backingRatio: 'Reserve NAV divided by on-chain ArchUSD supply.',
  basisYield:
    'Trailing 30-day annualized return earned by the reserve strategy. Past performance; not a rate promise.',
  onChainRetention:
    'Share of cumulative minted ArchUSD still circulating on-chain (1 − redeemed ÷ minted). Higher retention means a larger reserve float generating yield for ecosystem participants.',
  redistributableYield:
    'The float’s contribution to the distributable pool: reserve NAV multiplied by the basis rate. ArchUSD holders are paid first (the retention yield); the remainder funds the budget. Redeemed float earns nothing, so retention and the basis rate both scale this line. Derived metric; past performance, not a rate promise.',
} as const

export interface MethodologyEntry {
  term: string
  definition: string
}

// Methodology page content — renders §4 definitions (stub page per build handoff §3).
export const methodologyEntries: MethodologyEntry[] = [
  { term: 'Total Protocol Revenue', definition: tooltips.totalRevenue },
  { term: 'Total Value Locked (TVL)', definition: tooltips.tvl },
  { term: 'Yield Distributed to LPs', definition: tooltips.lpYield },
  { term: 'Aggregate LTV', definition: tooltips.aggregateLtv },
  { term: 'Distance to Liquidation', definition: tooltips.distanceToLiquidation },
  { term: 'Pool Utilization', definition: tooltips.poolUtilization },
  { term: 'Blockspace Fees', definition: tooltips.blockspaceFees },
  { term: 'Reserve NAV', definition: tooltips.reserveNav },
  { term: 'Backing Ratio', definition: tooltips.backingRatio },
  { term: 'Basis Yield (30d)', definition: tooltips.basisYield },
  { term: 'On-Chain Retention', definition: tooltips.onChainRetention },
  { term: 'Float Yield (30d)', definition: tooltips.redistributableYield },
]
