# Arch Prime transparency dashboard

A public page of live figures for Arch Prime on the Arch network: value locked,
trading, lending and its risks, and the aUSD and aBTC tokens. Every number is
read from the chain through one of the sources below; nothing on the page is
invented or assumed without saying so.

## What it shows

| Page | Address | Contents |
|---|---|---|
| Overview | `#overview` | TVL and its parts, volume, swap fees, lender interest, each product, chain activity, and where to check every figure |
| Markets | `#markets` | Arch Lend markets with rates and rate models, swap pools, vaults |
| Risk | `#risk` | Debt, loan health, a BTC price stress test, borrower concentration, liquidity by market, risk parameters, the record to date, and what aBTC is |
| ArchUSD | `#archusd` | aUSD supply, what aUSD is and who can create it, how it is valued, transfers, its lending market |
| Methodology | `#methodology` | The definition of every figure |

A panel can be linked to directly (`#risk/stress`), and the date range is kept
in the address (`#overview?range=7D`). The ArchUSD page is on by default; build
with `VITE_FEATURE_ARCHUSD=false` to hide it.

## Where the data comes from

| Source | What it provides |
|---|---|
| Arch Prime Analytics API | Protocol figures: TVL, volume, fees, interest, markets, the loan book, pools, vaults |
| Arch Explorer API | Chain activity, token supply and holders, aUSD transfers |
| Arch RPC | The aUSD and BTC bridge programs' settings, read from their own accounts |

The page shows how old each source's data is, links each panel to the place its
figures can be read first-hand, and offers the daily series as CSV.

## How the snapshot function works

The browser reads one document, `/api/snapshot`, and nothing else.

- `api/snapshot.ts` is a Vercel function. Its response is cached at the CDN for
  60 seconds and served stale while it revalidates, so the sources see about
  one round of requests a minute however many people have the page open.
- `server/buildSnapshot.ts` fetches the three sources. Analytics is required:
  if it fails, the function answers 502 and the page keeps its last figures,
  marked stale. The explorer and the Arch RPC are not: if either fails, the
  snapshot is served without that section and `meta.degraded` names the gap.
- `server/assemble.ts` and the files beside it turn the raw answers into the
  snapshot. They do no I/O, so every derived figure can be checked against
  fixed inputs.
- `src/data/snapshot.ts` is the contract between the function and the page.

The analytics API admits few queries at once and is shared with the Arch Prime
apps, so the function limits itself to two at a time (`server/http.ts`). The
bridge settings are one batched request (`server/archRpc.ts`).

The function runs against either state of the analytics API: where an older
build does not serve a figure, the snapshot carries null or the method used,
and the page labels what it shows.

## Configuration

Defaults are mainnet and need no setup. Each can be overridden from the
environment (`server/config.ts`):

| Variable | Default |
|---|---|
| `ARCH_NETWORK` | `mainnet` (`testnet` is the alternative) |
| `ANALYTICS_BASE_URL` | `https://apid-mainnet.up.railway.app` |
| `EXPLORER_BASE_URL` | `https://explorer.arch.network/api/v1/<network>` |
| `EXPLORER_API_KEY` | none; the explorer rate-limits harder without one |
| `ARCH_RPC_URL` | `https://rpc.mainnet.arch.network` (mainnet only) |
| `ABTC_MINT`, `AUSD_MINT`, `CLAMM_PROGRAM_ID`, `ARCH_LEND_PROGRAM_ID`, `VAULTS_PROGRAM_ID`, `PROPAMM_PROGRAM_ID` | the mainnet addresses |
| `HISTORY_START` | `2026-10-15T00:00:00Z` |

## Build and check

```bash
npm install
npm run dev      # local server; serves /api/snapshot from the same handler, reading live data
npm run check    # the snapshot's figures against a fixture, worked out by hand
npm run build    # strict type check, then the production build in dist/
npm run preview  # serve the production build
```

`npm run check` runs `scripts/check-snapshot.ts` with no network: it feeds the
fixture in `scripts/fixtures/` through the same code the function runs and
compares every derived figure with a value worked out by hand, for the current
analytics build, an older one, and each source failing. The fixture is test
data. Nothing the page or the function loads imports it, so it is in neither
the browser bundle nor the deployed function.

## Deploy

Vercel builds the page with `npm run build` into `dist/` and deploys
`api/snapshot.ts` as a function (`vercel.json`).

```bash
vercel          # preview
vercel --prod   # production
```

## Layout

```
api/snapshot.ts      the function
server/              fetching the sources and assembling the snapshot
src/data/snapshot.ts the snapshot contract
src/tabs/            one file per page, with its panels in a folder beside it
src/components/      shared panels, tables, charts
src/lib/             definitions, formatting, links, routing
scripts/             the fixture check
```
