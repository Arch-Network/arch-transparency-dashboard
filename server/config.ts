import type { Network } from '../src/data/snapshot.js'

// One deployment serves one network, as the analytics service does. Defaults
// are mainnet-v2; every value can be overridden from the environment.

export interface Config {
  network: Network
  analyticsBaseUrl: string
  explorerBaseUrl: string
  /** Optional. The explorer answers without one but rate-limits harder. */
  explorerApiKey: string | undefined
  abtcMint: string
  ausdMint: string
  /** Start of history for all-time series. Analytics serves at most 1500 daily buckets. */
  historyStart: string
  refreshSeconds: number
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const network: Network = env.ARCH_NETWORK === 'testnet' ? 'testnet' : 'mainnet'
  return {
    network,
    analyticsBaseUrl: env.ANALYTICS_BASE_URL ?? 'https://apid-mainnet.up.railway.app',
    explorerBaseUrl: env.EXPLORER_BASE_URL ?? `https://explorer.arch.network/api/v1/${network}`,
    explorerApiKey: env.EXPLORER_API_KEY || undefined,
    abtcMint: env.ABTC_MINT ?? '5b29d2ff08829791698237a6d056ec9fab29187072819b7bf7a43e431f027f18',
    ausdMint: env.AUSD_MINT ?? 'b8586267326264db356ca4c92b61dee74b4510cb95488897191d18520b3b18a4',
    historyStart: env.HISTORY_START ?? '2026-10-15T00:00:00Z',
    refreshSeconds: 60,
  }
}
