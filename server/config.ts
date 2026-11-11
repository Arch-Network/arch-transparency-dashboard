import type { Network, ProgramId } from '../src/data/snapshot.js'

// One deployment serves one network, as the analytics service does. Defaults
// are mainnet-v2; every value can be overridden from the environment.

export interface Config {
  network: Network
  analyticsBaseUrl: string
  explorerBaseUrl: string
  /** Optional. The explorer answers without one but rate-limits harder. */
  explorerApiKey: string | undefined
  /** Where the explorer's pages live, for links. Its pages open on mainnet;
   * how a page address selects another network is not verified, so there is
   * none elsewhere. */
  explorerSiteUrl: string | null
  /** The Arch RPC the bridges' accounts are read through. Their addresses are
   * mainnet's, so there is none elsewhere. */
  archRpcUrl: string | null
  abtcMint: string
  ausdMint: string
  /** The Arch Prime programs, by address (hex): the ids the analytics
   * service is deployed with. */
  programs: Record<ProgramId, string>
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
    explorerSiteUrl: network === 'mainnet' ? 'https://explorer.arch.network' : null,
    archRpcUrl: network === 'mainnet' ? (env.ARCH_RPC_URL ?? 'https://rpc.mainnet.arch.network') : null,
    abtcMint: env.ABTC_MINT ?? '5b29d2ff08829791698237a6d056ec9fab29187072819b7bf7a43e431f027f18',
    ausdMint: env.AUSD_MINT ?? 'b8586267326264db356ca4c92b61dee74b4510cb95488897191d18520b3b18a4',
    programs: {
      swap: env.CLAMM_PROGRAM_ID ?? '948fc4f4794c9fff7d249114f90176178c483f219b9f42a5d42ab3eb21d23b05',
      lend: env.ARCH_LEND_PROGRAM_ID ?? '907f70a9435dd47bb9f351905e1988962f8d6fe3629f9159a205a41e61be7c38',
      vaults: env.VAULTS_PROGRAM_ID ?? 'a1bf14cb9e197c446e0b10a9a732524f89dd2b13bd4c3dbd6b5ddcda242178e5',
      propamm: env.PROPAMM_PROGRAM_ID ?? '4022dec7e57f757682712b45ddf13a8f324710f4637cefc0ebacc6343caab24c',
    },
    historyStart: env.HISTORY_START ?? '2026-10-15T00:00:00Z',
    refreshSeconds: 60,
  }
}
