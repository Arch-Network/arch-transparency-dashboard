// Arch Prime design tokens for charts and inline styles.
// Values point at --ap-* custom properties in src/index.css so charts follow
// light (default) and dark ([data-theme="dark"]) themes automatically.

const token = (name: string) => `var(--ap-${name})`

// Consistent categorical mapping across every page: high-contrast, distinct,
// echoing 9031wyb82's executive clarity with Arch Prime's signature palette.
export const productColors = {
  lend: token('series-2'), // Arch Lend — Deep Arch Navy / Blue
  vaults: token('series-1'), // Vaults — Arch Orange
  swap: token('series-5'), // Arch Swap pools — Warm Gold
  perps: token('series-4'), // Arch Perps — Indigo
  custody: token('series-5'), // Custody / Theya — Warm Gold
  emerald: token('series-3'), // Emerald accent
  neutral: token('series-8'), // Whole-chain / aggregate series
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
