import type { Snapshot } from '../src/data/snapshot.js'
import { fetchAnalytics } from './analytics.js'
import { assemble } from './assemble.js'
import { loadConfig, type Config } from './config.js'
import { fetchExplorer } from './explorer.js'
import { client } from './http.js'

// Analytics shares a 3-permit query gate with the Arch Prime apps; stay under it.
const ANALYTICS_CONCURRENCY = 2
const EXPLORER_CONCURRENCY = 4

/** Fetches both upstreams and assembles one snapshot.
 *
 * Analytics is required: without it there is no dashboard, so its failure
 * rejects. The explorer is not: on failure the snapshot is served without the
 * chain and token sections and names the gap in `meta.degraded`. */
export async function buildSnapshot(cfg: Config = loadConfig(), now: Date = new Date()): Promise<Snapshot> {
  const analytics = await fetchAnalytics(client(cfg.analyticsBaseUrl, ANALYTICS_CONCURRENCY), cfg, now)

  const mints = [
    ...new Set([
      cfg.abtcMint,
      cfg.ausdMint,
      ...analytics.markets.map((m) => m.mint),
      ...analytics.pools.flatMap((p) => [p.mint_a, p.mint_b]),
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

  return assemble(analytics, explorer, cfg, now)
}
