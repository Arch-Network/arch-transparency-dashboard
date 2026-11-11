import type { Chain, ProgramActivity, ProgramId, Tokens } from '../src/data/snapshot.js'
import type { Config } from './config.js'
import type { ExplorerData, RawToken } from './explorer.js'
import { dayAxis, dayOf } from './series.js'

// Chain activity and the two tokens, from the Arch Explorer.

const DAY_MS = 86_400_000

/** The order the page lists the programs in. */
const PROGRAMS: ProgramId[] = ['swap', 'lend', 'vaults', 'propamm']

export function buildChain(e: ExplorerData, cfg: Config): Chain {
  return {
    arch_block: e.stats.latest_block_height,
    btc_tip_block: e.btcTip,
    tx_24h: e.stats.tx_24h,
    tx_total: e.stats.total_transactions,
    tps_24h: e.stats.tx_24h / (DAY_MS / 1000),
    tps_peak: e.stats.peak_tps,
    avg_block_time_ms: e.blocks24h > 0 ? DAY_MS / e.blocks24h : null,
    validators_active: e.validatorsActive,
    accounts_total: e.stats.total_accounts,
    programs: PROGRAMS.map((id) => programActivity(id, cfg.programs[id], e)),
  }
}

function programActivity(id: ProgramId, address: string, e: ExplorerData): ProgramActivity {
  const listed = e.programCounts?.counts[address]
  // A program the explorer did not list had no transaction, provided the list was not cut short.
  const tx24h = listed ?? (e.programCounts?.complete ? 0 : null)
  return { id, address, tx_24h: tx24h }
}

export function buildTokens(e: ExplorerData, cfg: Config, today: string): Tokens {
  const units = (t: RawToken) => Number(t.supply) / 10 ** t.decimals
  const abtc = e.tokens[cfg.abtcMint]
  const ausd = e.tokens[cfg.ausdMint]
  // The explorer omits days without a transfer; those days moved nothing.
  const byDay = new Map(e.ausdAnalytics.daily.map((d) => [dayOf(d.day), d]))
  const firstDay = [...byDay.keys()].sort()[0]
  const axis = firstDay ? dayAxis(firstDay, today) : []
  return {
    abtc_mint: cfg.abtcMint,
    ausd_mint: cfg.ausdMint,
    abtc_supply: units(abtc),
    abtc_holders: abtc.holders,
    ausd_supply: units(ausd),
    ausd_holders: ausd.holders,
    ausd_transfers_total: e.ausdAnalytics.total_transfers,
    ausd_transfer_volume_total: e.ausdAnalytics.total_volume_ui,
    ausd_transfers_daily: axis.map((date) => ({
      date,
      transfers: byDay.get(date)?.transfers ?? 0,
      volume: byDay.get(date)?.volume_ui ?? 0,
    })),
  }
}
