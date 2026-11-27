import type { Definition } from './definitions'

// Definitions for Arch Perps figures, matching how the perps engine
// (`perps/crates/engine`, `perps/crates/server`) and on-chain `Exchange`
// program (`perps/program`) compute each number.

export const perpsDefinitions = {
  openInterest: {
    id: 'perps-open-interest',
    term: 'Perps open interest',
    short: 'Total USD value of all open taker positions (long plus short) at each market’s mark price, from the Arch Perps engine.',
    long: 'Gross notional value of every open taker position across all Arch Perps markets: (long lots + short lots) × mark price, converted from collateral atoms (aUSD, valued at $1). Long and short open interest are also reported separately, along with the maker’s net directional exposure across markets. Because the exchange operates a single-maker model where the maker takes the opposite side of uncrossed taker flow, gross open interest counts both taker sides.',
  },
  volume: {
    id: 'perps-volume',
    term: 'Perps trading volume, 24 h',
    short: 'Notional value of perpetual fills over the trailing 24 hours, counted in memory by the perps engine. A cross between two takers counts once.',
    long: 'Total notional value traded across all Arch Perps markets over the trailing 24 hours, counted from fills by the perps engine server (in aUSD, valued at $1). A fill matched against the maker or a liquidation counts once; a cross between two takers produces two fill records and is halved so each trade counts once. Because the engine keeps this rolling window in memory from its journal, a market’s 24-hour volume reads as unavailable until a full day of fills is covered. Reported separately from spot swap and PropAMM volume.',
  },
  vaultCollateral: {
    id: 'perps-vault-collateral',
    term: 'Perps vault collateral (on-chain)',
    short: 'Total collateral recorded on chain in the perps Exchange account: the sum of all trader, maker, fee and insurance account balances. Kept separate from protocol TVL.',
    long: 'Total aUSD collateral recorded in the perps program’s on-chain Exchange account (`total_balance`), read directly through the public Arch RPC on each snapshot refresh. It equals the sum of every on-chain perps account balance — covering the maker’s collateral, trader deposits, accumulated fees, and the insurance fund — as of the last on-chain settlement batch. It is reported separately from the Overview protocol TVL figure so TVL stays strictly comparable with Arch Prime Analytics’ daily series.',
  },
  makerBacking: {
    id: 'perps-maker-backing',
    term: 'Perps maker equity & margin',
    short: 'The market maker’s equity inside the perps exchange beside its required margin (net + gross rates) and what takers would post unnetted.',
    long: 'The perps exchange’s single market maker posts collateral on chain and is margined on its net book across markets plus a gross-notional buffer (`maker_requirement`). Maker equity is the maker’s on-chain balance plus unsettled PnL. Unnetted requirement is the sum of each market’s taker initial margin applied to gross open interest, shown for comparison against the maker’s netted requirement.',
  },
  fundingRate: {
    id: 'perps-funding-rate',
    term: 'Perps funding rate',
    short: 'Rate longs pay shorts (negative when shorts pay longs), updated by the engine and recorded every five minutes. Annualized linearly (hourly × 8,760).',
    long: 'Periodic funding rate charged between long and short perpetual holders to anchor the contract to its index price. Positive rates mean longs pay shorts; negative rates mean shorts pay longs. The engine publishes the hourly rate in parts per million (`funding_rate_ppm_per_hour`) and records one reading every five minutes in memory (up to 30 days between restarts). Eight-hour and annualized rates are linear multiples of the hourly rate (× 8 and × 8,760), not compounded.',
  },
  insuranceAndFees: {
    id: 'perps-fees-insurance',
    term: 'Perps fees & insurance fund',
    short: 'Cumulative taker fees held in the exchange fee account and reserves held in the insurance fund account (from liquidation fees).',
    long: 'Balances of the perps engine’s fee account (`fees_collected`) and insurance fund account (`insurance_fund`), in aUSD valued at $1. Taker fills pay the market’s taker fee rate (currently 2 bps of notional) to the fee account, and liquidations pay the liquidation fee rate (currently 50 bps of closed notional) into the insurance fund.',
  },
  settlement: {
    id: 'perps-settlement',
    term: 'Perps settlement & escape hatch',
    short: 'Orders match off-chain and settle onto Arch in periodic batches (`settle_seq`). If the operator stops, owners can withdraw directly on chain after the exit delay.',
    long: 'Arch Perps matches trades off-chain in the engine and posts periodic settlement batches to the Arch perps program, updating on-chain account balances and incrementing `settle_seq`. Comparing the engine’s `settle_seq` with the on-chain Exchange account’s `settle_seq` shows whether settlement is in sync. Owners can always request an on-chain withdrawal without the operator and execute it once the program’s `withdraw_delay_s` has elapsed.',
  },
  spreadAndLeverage: {
    id: 'perps-spread-leverage',
    term: 'Perps spread & max leverage',
    short: 'Top-of-book maker bid-ask spread in basis points and maximum initial leverage (`1 / initial_margin_rate`, floored to 2 decimals).',
    long: 'Top-of-book spread is computed from the smallest tier of the maker’s live standing quote: `(ask − bid) / midpoint × 10,000` in basis points, or blank when the maker is not quoting. Max leverage is `1 / initial_margin_rate`, rounded down to two decimal places, matching the Arch Perps SDK. Markets list both initial margin (required to open or grow a position) and maintenance margin (below which a position can be liquidated).',
  },
} as const satisfies Record<string, Definition>

export const perpsDefinitionList: Definition[] = [
  perpsDefinitions.openInterest,
  perpsDefinitions.volume,
  perpsDefinitions.vaultCollateral,
  perpsDefinitions.makerBacking,
  perpsDefinitions.fundingRate,
  perpsDefinitions.insuranceAndFees,
  perpsDefinitions.settlement,
  perpsDefinitions.spreadAndLeverage,
]
