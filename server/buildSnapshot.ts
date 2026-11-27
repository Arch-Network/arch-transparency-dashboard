import type { Snapshot } from '../src/data/snapshot.js'
import { fetchAnalytics } from './analytics.js'
import { assemble } from './assemble.js'
import { fetchBridges } from './bridge.js'
import { loadConfig, type Config } from './config.js'
import { fetchExplorer } from './explorer.js'
import { client } from './http.js'
import { fetchTheya } from './theya.js'

// Analytics shares a 3-permit query gate with the Arch Prime apps; stay under it.
const ANALYTICS_CONCURRENCY = 2
const EXPLORER_CONCURRENCY = 4

/** Fetches the upstreams and assembles one snapshot.
 *
 * Analytics is required: without it there is no dashboard, so its failure
 * rejects. The explorer, the bridges' accounts and the Theya roster feed are
 * not: on failure the snapshot is served without that section and names the
 * gap in `meta.degraded`. */
export async function buildSnapshot(cfg: Config = loadConfig(), now: Date = new Date()): Promise<Snapshot> {
  // One request to the Arch RPC, alongside the rest.
  const bridges = cfg.archRpcUrl
    ? fetchBridges(cfg.archRpcUrl, cfg, now).catch((err: unknown) => {
        console.error('snapshot: bridge settings were not read', err)
        return null
      })
    : null
  const analyticsClient = client(cfg.analyticsBaseUrl, ANALYTICS_CONCURRENCY)
  const theyaClient =
    cfg.theyaApiBaseUrl && cfg.theyaApiBaseUrl === cfg.analyticsBaseUrl && !cfg.theyaApiToken
      ? analyticsClient
      : cfg.theyaApiBaseUrl
        ? client(
            cfg.theyaApiBaseUrl,
            1,
            cfg.theyaApiToken ? { Authorization: `Bearer ${cfg.theyaApiToken}` } : undefined,
          )
        : null
  const theya =
    cfg.theyaApiBaseUrl && theyaClient
      ? fetchTheya(theyaClient, cfg.theyaApiBaseUrl).catch((err: unknown) => {
          console.error('snapshot: theya section failed', err)
          return null
        })
      : null
  const analytics = await fetchAnalytics(analyticsClient, cfg, now)

  const mints = [
    ...new Set([
      cfg.abtcMint,
      cfg.ausdMint,
      ...analytics.markets.map((m) => m.mint),
      ...analytics.pools.flatMap((p) => [p.mint_a, p.mint_b]),
      ...analytics.vaults.flatMap((v) => [v.asset_mint, v.share_mint]),
    ]),
  ]
  const headers = cfg.explorerApiKey ? { Authorization: `Bearer ${cfg.explorerApiKey}` } : undefined
  const explorer = await fetchExplorer(
    client(cfg.explorerBaseUrl, EXPLORER_CONCURRENCY, headers),
    mints,
    cfg.ausdMint,
  ).catch((err: unknown) => {
    console.error('snapshot: explorer section failed', err)
    return null
  })

  return assemble(analytics, explorer, await bridges, cfg, now, await theya)
}
