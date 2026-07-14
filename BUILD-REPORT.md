# Build Report — Arch Transparency Dashboard

**Ticket:** COMMS-DASH-002 (build execution of COMMS-DASH-001 spec)
**Date:** 2026-07-01
**Location:** `Arch/projects/transparency-dashboard/`
**Production deployment:** https://arch-transparency-dashboard.vercel.app (Vercel project `matt-archnetworks-projects/arch-transparency-dashboard`)

## Acceptance criteria → evidence

| # | Criterion (build handoff §6) | Status | Evidence |
|---|---|---|---|
| 1 | `npm install && npm run gen && npm run build` succeeds clean; `npm run dev` serves | PASS | Local build output: `✓ built in 1.4s`, zero TS errors; Vercel production build succeeded (deployment `Ready`, 15s). Dev server verified via preview session on port 5199. |
| 2 | TypeScript strict mode, zero errors; generator assertions pass | PASS | `tsconfig.app.json` / `tsconfig.node.json` both `"strict": true`; `tsc -b` clean. Generator run prints "All assertions passed" — 13 assertion groups covering TVL composition, revenue stream sums, cumulative monotonicity, per-loan LTV caps, aggregate LTV, utilization identity, flywheel ratio derivation, liquidation-revenue day matching, ArchUSD backing band, retention identity, supply reconciliation, liquidity sums. |
| 3 | All four tabs render every module from master §3 + §8.7 additions | PASS | Screenshots: `docs/screenshots/tab-overview-1280.png`, `tab-revenue-1280.png`, `tab-risk-1280.png`, `tab-archusd-1280.png`. §8.7 modules present: stress test (−10/−20/−30), health-factor histogram, top-10 borrower share, insurance fund card flagged `[MOCK — mechanism pending confirmation]`, bad debt card. |
| 4 | §10 CORE metrics present; EXTENDED deferred list in README | PASS | CORE audit: chain (tx 24h/cum, block time, TPS current/peak, validators, blockspace fees BTC+USD, avg fee, block heights in header) · revenue (cumulative/24h/7d/30d, 5-stream stacked daily, share donut, Chain/Primitives/Ecosystem rollup toggle, run-rate labeled 30d × 12.17) · TVL (current, Δ, stacked series, BTC on Arch, pool depth per pair, available USDT/USDC) · Swap (volume 24h/daily/cum, swap fees, LP yield) · Lend (collateral BTC+USD, debt outstanding, loans issued $+count, active loans, aggregate LTV, utilization, borrow APR, supply APY, rate curve, params card 80/86/≤5%/90%) · risk & solvency (LTV histogram, HF distribution, within-2pts count, loan table sorted by distance, stress test, bad debt, top-10 share) · liquidations (history table with recovery %, cumulative volume) · ArchUSD (supply, NAV+attestation, backing ratio, basis 30d, retention, mint/redeem daily, cumulative redistributed) · distribution (LP yield cumulative/7d/daily, split by source in schema). Deferred EXTENDED items listed in README. |
| 5 | Responsive at 1280 / 768 / 390 | PASS | `docs/screenshots/tab-overview-768.png`, `tab-overview-390.png`; KPI cards stack, tables scroll horizontally (`overflow-x-auto`, `min-w` on tables); no horizontal body overflow at 390 (verified `scrollWidth === innerWidth`). |
| 6 | Flywheel renders correctly as static screenshot | PASS | `docs/screenshots/flywheel-static.png` — 4 nodes N/E/S/W with orange badges + metric chips, Network Value hub (TVL + run-rate, no logo), dashed edges with arrowheads, every edge labeled with 30d flow + Δ%, health panel with 5 ratios + sparklines, status line "Compounding" earned by all five ratios trending up (7d-mean vs prior 7d-mean). Dash animation is CSS-only and disabled under `prefers-reduced-motion`. |
| 7 | Screenshots of each tab in `docs/screenshots/` | PASS | 6 PNGs: 4 tabs @1280 full height, overview @768 and @390, flywheel crop. |
| 8 | README documents run/build, feature flag, mock regeneration, live-API swap steps | PASS | `README.md` — all four sections plus schema-extension disclosure and deferred-EXTENDED list. |

## Hard constraints (build handoff §5)

1. **No invented mechanisms** — no buybacks, staking, miner-security allocation, revenue-allocation splits, token price, or market cap anywhere. Module 2.4 renders only derivable quantities (distributed vs. retained) with "allocation pending confirmation" labeling; the removed v1 40/35/25 donut was not rebuilt.
2. **Cream background #F3EFD7** — set at `html`/`body` level; full palette + serif/sans typography per master §5; chart stream colors fixed in `src/theme.ts` (never inlined).
3. **Demonstration-data footnote** — `DemoDataFootnote` renders on all four tabs and the Methodology page.
4. **Voice** — labels/copy from the spec documents; zero forbidden vocabulary; zero emojis.
5. **Schema fidelity** — `src/types.ts` mirrors master §6 field names exactly; extensions are additive only and documented in README.

## Master §9 checklist

- [x] Four tabs per §3, all modules (ArchUSD behind `VITE_FEATURE_ARCHUSD`, default ON for review)
- [x] All components read exclusively from the mock JSON contract
- [x] Flywheel legible as static screenshot
- [x] Cream background; palette and chart-series colors per §5
- [x] Tooltips use §4 definitions verbatim, ending with the Methodology link
- [x] Demonstration-data footnote on every view
- [x] Responsive; loan table sortable/filterable (default sort distance-to-liquidation asc, min-collateral + LTV-range filters, 25-row pagination over 214 loans)
- [x] Zero forbidden vocabulary; zero emojis
- [x] All §8 v1 corrections applied (no fabricated mechanisms/markets/assets; §8.6 copy fixes: "BTC on Arch", "Loans Issued (cumulative)" distinct from debt outstanding, header block reference)
- [x] §10 CORE coverage audited (row 4 above); EXTENDED deferred list in README

## Design supersedure (2026-07-01, post-first-deploy)

Matt reviewed the first deployment and directed the build to match the designer
reference file (`Arch Dashboard.dc.html` in the design zip) instead of the
written spec's cream system. The designer file **directly contradicts** master
spec §5 ("Cream #F3EFD7, never white") and §8.5 — the written docs should be
updated to prevent regression. Changes applied:

- Palette: near-white #FDFCF7 page, white cards, navy #1F2B4D primary, per-series colors from the file's `C` object (blockspace=orange, swap=gold, lend=navy, liquidation=slate, partner=#B0AA9C)
- Typography: IBM Plex Sans + IBM Plex Mono (replaces Lora/Poppins)
- Positive deltas green #1A8F4C (replaces spec's purple rule)
- Header: navy active pill, DEMO DATA chip, mono meta; per-tab title blocks
- Flywheel: dotted arcs, small-caps mono edge captions, text-only hub
- Value Distributed: 3-way LP/Reserves/Treasury split with SPLIT PENDING chip (designer's treatment of Open Item 5)
- Liquidation history ships the empty state ("No liquidations to date"); liquidation revenue stream is zero at launch
- Health factor redefined per designer: collateral-to-debt buffer (100 ÷ LTV), liquidatable below ~1.16
- Liquidity module moved from Risk to Overview (designer placement)

## Budget-machine rebuild (2026-07-03, per Matt's mechanism sessions)

The Revenue & Flywheel tab was rebuilt around the mechanism defined in
`Arch/docs/ARCH-ECONOMIC-MODEL.md` (v0.3) and the bootstrap sizing model:

- **Three acts:** Engines (the Float + On-Chain Revenue, six streams incl. new Asset Management), the Budget (income allocated against published targets: rate wedge 7.0%/4.5%, retention band 50–60%, 12-month buffer, surplus deployed into the ecosystem), the Result (net inflow, attraction per $1 spent, float, cumulative deployed surplus + the loop graphic).
- **Status model:** "The flywheel is funded" = rates held without buffer draw + retention in band + buffer full. Degrades honestly to "Funded from buffer."
- **Mock economics updated to match the mechanism:** subsidized wedge rates (supply APY 7.0 above borrow APR 4.5 — lending is a loss-leader by design), lending-spread stream reduced to a small protocol share, ArchUSD float seeded at $69M (the raise buys the float) with user flows layered on top, AM revenue ~$3M/yr as the largest on-chain stream, float as the largest single earner. New assertions: budget allocations sum to income, wedge holds daily, deployed surplus non-decreasing, buffer at target.
- **Renames per Economic Model v0.3:** ArchUSD "Redistributable Yield" → "Float Yield" (NAV × basis, holders paid first, net to budget); "Yield Redistributed" → "Retention Yield Paid." Rates added to the Overview stat strip.
- Removed: Flywheel Health panel, Value Distributed module, revenue donut (folded into Engine 2) — superseded by the budget view.
- Demonstration targets flagged on-face ("final policy pending confirmation"); all §7 open items still gate public launch.

## Deviations / judgment calls

- **Schema extensions** (documented in README): 7 additive fields/blocks required by modules master §6 doesn't cover. No §6 field renamed.
- **Module 2.4 (value distributed):** rendered as distributed-vs-retained cumulative split rather than a three-way LP/reserves/treasury split, because the routing is undecided (Open Item 5) and §8.1 forbids inventing allocation splits. Labeled "allocation pending confirmation."
- **Mock attraction ratio** lands at ~16× (spec example says "e.g. 1.6×"). Internal consistency is enforced (net new TVL ÷ distributed); reaching 1.6× would have required a nearly flat TVL series, which conflicts with the early-growth shape requirement. Realism is explicitly not a review bar (§8.3).
- **Empty liquidation state:** mock contains 4 liquidation events so the table/chart render is reviewable; the "No liquidations to date" empty state is implemented and displays whenever `risk.liquidations` is empty.
- **Tab deep links** (`#overview` etc.) added beyond spec — needed for screenshot capture; also useful for sharing.

## Verification method

Producing agent ≠ verifying evidence: verification was done against the running
app (browser preview session + headless-Chrome captures), not by code
inspection alone. Console clean (zero errors/warnings) across all four tabs.
Production deployment returns HTTP 200 with the built bundle.
