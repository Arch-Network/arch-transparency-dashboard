// Arch transparency dashboard design tokens for charts and inline styles. The
// values are the --ap-* custom properties in src/index.css (the Arch o11y
// dashboard's tokens: dark by default, light under [data-theme="light"]), so
// they follow the theme; tailwind.config.ts names the same properties. Never
// inline hex in components.

const token = (name: string) => `var(--ap-${name})`

// Categorical chart series, clear of the state colors. A chart takes them in
// order: its first series is palette[0], its second palette[1], and so on.
export const palette = [
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
  card: token('card'), // card panels
  raised: token('raised'), // tooltips and popovers
  soft: token('soft'), // hover wash, chart cursor
  line: token('line'), // card borders, chart grid
  line2: token('line-2'), // control and tooltip borders
  ink: token('ink'), // primary text
  ink2: token('ink-2'), // secondary text, axis ticks
  up: token('up'), // healthy / positive
  down: token('down'), // failing / negative
  warn: token('warn'), // warning
  // Names from the previous palette, kept for the dormant mock-era components
  // only; nothing reachable from the app uses them.
  bg: token('page'),
  border: token('line'),
  borderFaint: token('line'),
  grid: token('line'),
  inkSecondary: token('ink-2'),
  inkMuted: token('ink-2'),
  inkFaint: token('ink-3'),
  orange: token('brand'),
  navy: palette[0],
  gold: palette[4],
  slate: palette[7],
  partner: palette[5],
  green: token('up'),
  red: token('down'),
  bronze: palette[2],
  chipBg: token('warn-soft'),
  chipText: token('warn'),
} as const

// Canonical revenue stream taxonomy — five names, this order, everywhere.
// Colors per designer reference: C = {orange, gold, navy, slate, partner}.
export const streams = [
  { key: 'blockspace_usd', label: 'Blockspace Fees', engine: 'Chain', color: colors.orange },
  { key: 'swap_usd', label: 'Swap Fees', engine: 'Primitives', color: colors.gold },
  { key: 'lend_spread_usd', label: 'Lending Spread', engine: 'Primitives', color: colors.navy },
  { key: 'liquidation_usd', label: 'Liquidation Revenue', engine: 'Primitives', color: colors.slate },
  { key: 'partner_usd', label: 'Partner & API Revenue', engine: 'Ecosystem', color: colors.partner },
  { key: 'am_usd', label: 'Asset Management', engine: 'Ecosystem', color: colors.bronze },
] as const

export type StreamKey = (typeof streams)[number]['key']

export const engineColors: Record<string, string> = {
  Chain: colors.orange,
  Primitives: colors.navy,
  Ecosystem: colors.partner,
}

// Chain spec constants — subject to final lock (master spec Open Item 1).
// Build against 180ms / 1,500 TPS; keep as config constants.
export const chainSpec = {
  blockTimeMs: 180,
  tpsCapacity: 1500,
} as const

export const DEMO_FOOTNOTE = 'Demonstration data — mainnet metrics go live at launch.'
