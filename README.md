# Arch Transparency Dashboard

Public transparency dashboard for the Arch Network ecosystem: protocol revenue,
TVL, trading volume, LP yield, the open loan book, and ArchUSD health.

Built per `Arch/Transparency-Dashboard-Designer-Handoff-2026-07-01.md` (master spec),
`Arch/Flywheel-Graphic-Designer-Handoff-2026-07-01.md` (flywheel component), and
`Arch/Transparency-Dashboard-Build-Handoff-Claude-Code-2026-07-01.md` (engineering).
Tickets: COMMS-DASH-001 / COMMS-DASH-002.

## Design system

**The visual system follows the designer reference file (`Multi-hub metrics dashboard design.zip` → `Arch Dashboard.dc.html`, 2026-07-01), which supersedes the cream palette in the written master spec §5 per Matt's direction (2026-07-01):** warm near-white page (#FDFCF7), white cards with #EAE7DE borders, navy #1F2B4D primary series and active nav pill, orange #EC641D accent, IBM Plex Sans (UI) + IBM Plex Mono (all numerals), green/red deltas, DEMO DATA / MOCK / SPLIT PENDING chips. All tokens live in `src/theme.ts`.

## Stack

- Vite + React + TypeScript (strict), static build — no backend
- Recharts for standard charts; the flywheel is a custom SVG component
- Tailwind CSS with design tokens (`src/theme.ts` is the single source of hex values)
- Fonts: IBM Plex Sans + IBM Plex Mono via Google Fonts (numerals tabular)
- All data loads from `src/data/mock.json`. No wallet connection, no web3 dependencies.

## Run / build

```bash
npm install
npm run gen      # regenerate src/data/mock.json (deterministic, seeded)
npm run dev      # dev server
npm run build    # typecheck (strict) + production build → dist/
npm run preview  # serve the production build locally
```

## Mock data regeneration

`npm run gen` runs `src/data/generate-mock.ts` (seeded PRNG, seed `20260701` —
same output every run). It produces 30 days of daily series with an early-growth
shape and enforces internal consistency with hard assertions:

- TVL = swap liquidity + lend deposits + collateral, per day
- Revenue streams sum to total revenue; cumulative series are monotonic running sums
- Every loan: debt ≤ collateral × max LTV; aggregate LTV = Σdebt ÷ Σcollateral
- Utilization = borrowed ÷ deposits; available = deposits − borrowed
- Flywheel ratios derive from flows (recycle = distributed ÷ revenue; attraction = net new TVL ÷ distributed)
- ArchUSD: backing ratio = NAV ÷ supply (101–103% band); retention = 1 − redeemed ÷ minted

If an assertion fails the generator exits non-zero and writes nothing.

## Feature flag — ArchUSD tab

The ArchUSD tab is behind `VITE_FEATURE_ARCHUSD`. It is **ON by default**
(including production builds) so the tab is reviewable. To hide it:

```bash
VITE_FEATURE_ARCHUSD=false npm run build
```

On Vercel, set the `VITE_FEATURE_ARCHUSD=false` environment variable and
redeploy. Per master spec Open Item 10(e), the tab must stay hidden in public
until ArchUSD is live.

## Tab deep links

Tabs are addressable by URL hash: `#overview`, `#revenue`, `#risk`, `#archusd`.

## Swapping mock data for a live API

`src/types.ts` mirrors the master spec §6 schema — those field names are the
contract. To wire live data:

1. Stand up an endpoint returning the `MockData` shape (one JSON payload).
2. In `src/App.tsx`, replace the static import
   (`import mockJson from './data/mock.json'`) with a fetch of that endpoint
   (e.g. `useEffect` + `useState<MockData>`, or a small SWR hook), refreshing
   every `meta.refresh_minutes`.
3. Remove/condition the `DemoDataFootnote` component once real metrics flow.
4. Everything else stays: all components read exclusively from the `MockData` object.

### Schema extensions beyond master §6

These fields were added because modules required by master §3 / §8.7 / §10 have
no home in the §6 schema. Every §6 field name is unchanged. Extensions:

| Field | Why |
|---|---|
| `meta.arch_block`, `meta.btc_anchor_block` | Header "Arch block N · settled to Bitcoin block M" (build handoff §3) |
| `meta.btc_price_usd` | Single BTC/USD mark used for all conversions in the mock |
| `series.lp_yield_daily[].swap_usd`, `.lend_usd` | LP yield split by source (§10 Distribution CORE) |
| `risk.loans_issued_cum_usd`, `risk.loans_issued_count` | Loans issued vs. debt outstanding (§10 Credit CORE, §8.6) |
| `risk.bad_debt_usd` | Bad Debt card (§8.7) |
| `risk.insurance_fund_usd` | Insurance Fund card, flagged `[MOCK — mechanism pending confirmation]` (§8.7, Open Item 9) |
| `liquidity` block (pools + lend availability) | §8.2 Liquidity module; §10 TVL CORE (pool depth per pair, available stables) |
| `revenue_daily[].am_usd` (sixth stream) | Asset-management fee revenue — HFT acquisition AM business (Matt, 2026-07-03) |
| `archusd.seed_float_usd` | Protocol-seeded float at genesis; user flows layer on top (bootstrap model) |
| `budget` block (targets, income, allocations, buffer, surplus series) | The budget machine — Arch Economic Model v0.3: income → wedge → retention yield → buffer → deployed surplus |

Derived client-side (no schema needed): health-factor distribution, price-shock
stress test, top-10 borrower share, loans-within-2pts count (all from `risk.loans`),
TPS current/peak (from tx counts), 7d revenue delta (from `revenue_daily`).

### EXTENDED metrics consciously deferred (master §10)

Active/new addresses, settlement-tx count to Bitcoin, blockspace utilization %,
revenue-per-transaction, fastest-growing-stream callout, weekly revenue table,
net deposit/withdrawal flow chart, largest pools table, per-pair volume split,
trade count / average trade size, originations vs. repayments, interest accrued,
median loan size/LTV, VaR at −20%, collateral concentration over time, oracle
price note, liquidations-by-day chart, unique earning wallets, average yield per
LP. All are additive chart/table modules on the same schema; none block launch.

## Deploy (Vercel)

```bash
vercel        # preview
vercel --prod # production
```

`vercel.json` pins the Vite framework, `npm run build`, output `dist/`.

## Open items gating public launch

See master spec §7 (items 1–10). Highlights baked into this build: chain spec
rendered from config constants (180ms / 1,500 TPS — Open Item 1), insurance fund
flagged as mock (Open Item 9), basis-yield "past performance" language (Open
Item 10d), Methodology page marked pending review (Open Item 7).
