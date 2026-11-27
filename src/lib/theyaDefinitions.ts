import type { Definition } from './definitions'

/** Methodology and tooltip definitions for the Theya Bitcoin holdings section,
 * kept in their own module so parallel work on `definitions.ts` stays clean. */
export const theyaDefinitions = {
  theyaHoldings: {
    id: 'theya-holdings',
    term: 'Theya Bitcoin holdings',
    short:
      'Confirmed unspent Bitcoin across the tracked Theya mainnet address roster, scanned every four hours by Arch Prime Analytics via the Arch indexer’s Bitcoin API. Separate from Arch Prime protocol TVL.',
    long: 'Confirmed unspent Bitcoin (T01) held across the 3,614 mainnet Bitcoin addresses in the tracked Theya roster, valued in USD (T02) at the same Coinbase hourly BTC price Arch Prime Analytics uses for aBTC. The analytics ingester scans every address sequentially against the Arch indexer’s mainnet Bitcoin UTXO API every four hours and stores a scan only when every address is read with no duplicate output. A scan runs over roughly an hour rather than a single Bitcoin block, so its start and end tip heights are shown alongside the balance. Unconfirmed outputs are counted separately and excluded from the balance. These holdings are reported separately from Arch Prime protocol TVL (swap pools, Arch Lend liquidity and vaults), and whether the Theya addresses also back aBTC is not established.',
  },
  combinedAssets: {
    id: 'combined-assets',
    term: 'Combined assets on Arch',
    short:
      'Total aUSD, aBTC, confirmed Theya BTC and other bridged assets (aETH, aHYPE) valued at Arch Prime Analytics’ reference prices (O01). Separate from protocol TVL.',
    long: 'Combined USD value published as O01 by Arch Prime Analytics’ Prime Transparency endpoint: outstanding aUSD supply at $1, plus outstanding aBTC supply and confirmed Theya BTC at the hourly BTC reference price, plus outstanding supply of other bridged assets (aETH and aHYPE) at their hourly reference prices. Each token’s supply is counted once regardless of where it sits in pools, banks or vaults. The 24-hour change (O02) compares two endpoint valuations 24 hours apart and is marked estimated when the earlier point carried a Theya scan older than its normal freshness window. Whether the Theya roster also backs aBTC is not established.',
  },
} as const satisfies Record<string, Definition>
