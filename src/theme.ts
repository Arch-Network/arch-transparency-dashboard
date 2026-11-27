// Arch Prime design tokens for charts and inline styles.
// Mirrors Arch-Network/arch-prime (apps/web-v2/app/ap/app.css & charts.css).
// Values point at --ap-* custom properties in src/index.css so charts follow
// light (default) and dark ([data-theme="dark"]) themes automatically.

const token = (name: string) => `var(--ap-${name})`

// Consistent categorical mapping across every page: a color always names the
// same product. Slots 1–7 match arch-prime's validated dataviz palette;
// `perps` and `custody` are pre-assigned for upcoming Perps and Theya sections.
export const productColors = {
  lend: token('series-2'), // Arch Lend — Arch Blue (#2a78d6 / #3987e5)
  vaults: token('series-3'), // Vaults — Emerald (#1baf7a / #199e70)
  swap: token('series-4'), // Arch Swap pools — Indigo (#6250d6 / #9085e9)
  perps: token('series-1'), // Perps — Warm Orange (#eb6834 / #d95926)
  custody: token('series-5'), // Custody / Theya — Gold (#c9940a / #e2b23a)
  neutral: token('series-8'), // Whole-chain / non-product / aggregate series
} as const

export const seriesColors = [
  token('series-1'),
  token('series-2'),
  token('series-3'),
  token('series-4'),
  token('series-5'),
  token('series-6'),
  token('series-7'),
  token('series-8'),
] as const

export const colors = {
  chrome: token('chrome'),
  canvas: token('canvas'),
  page: token('page'),
  card: token('card'),
  raised: token('raised'),
  float: token('float'),
  soft: token('soft'),
  soft2: token('soft-2'),
  line: token('line'),
  line2: token('line-2'),
  ink: token('ink'),
  ink2: token('ink-2'),
  ink3: token('ink-3'),
  brand: token('brand'),
  brandSoft: token('brand-soft'),
  up: token('up'),
  upSoft: token('up-soft'),
  down: token('down'),
  downSoft: token('down-soft'),
  warn: token('warn'),
  warnSoft: token('warn-soft'),
  chartGrid: token('chart-grid'),
  chartCrosshair: token('chart-crosshair'),
  tooltipBg: token('chart-tooltip-bg'),
  tooltipFg: token('chart-tooltip-fg'),
  tooltipMuted: token('chart-tooltip-muted'),
  tooltipRule: token('chart-tooltip-rule'),
} as const
