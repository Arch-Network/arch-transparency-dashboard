// Arch transparency dashboard design tokens — single source of truth for hex
// values, extracted from the designer reference file ("Arch Dashboard.dc.html",
// 2026-07-01). tailwind.config.ts mirrors these literals; never inline hex in
// components.
//
// NOTE: this supersedes the cream palette in the written master spec §5 per
// Matt's direction (2026-07-01): white/clean per the designer files.

export const colors = {
  bg: '#FDFCF7', // page background — warm near-white
  card: '#FFFFFF', // card panels
  border: '#EAE7DE', // card borders
  borderFaint: '#F1EEE4', // header/footer hairlines
  grid: '#F0EDE4', // chart grid
  ink: '#17170F', // primary text
  inkSecondary: '#55554C',
  inkMuted: '#77776C',
  inkFaint: '#8A8A7E',
  orange: '#EC641D', // brand accent
  navy: '#1F2B4D', // primary data series / active nav pill
  gold: '#C79A3A', // secondary data series
  slate: '#7A86A8', // tertiary data series
  partner: '#B0AA9C', // Partner & API series
  green: '#1A8F4C', // positive deltas
  red: '#B03A2E', // negative deltas / critical
  bronze: '#8A5A1E', // Asset Management series
  chipBg: '#FBE9CF', // DEMO DATA / MOCK / SPLIT PENDING chips
  chipText: '#8A5A1E',
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

// TVL components (designer reference: collateral=orange, deposits=navy, swap=gold).
export const tvlColors = {
  collateral: colors.orange,
  deposits: colors.navy,
  swap: colors.gold,
} as const

// Assets-by-category segments (designer reference: deposited=navy, borrowed=orange).
export const categoryColors = {
  deposited: colors.navy,
  borrowed: colors.orange,
} as const

// Chain spec constants — subject to final lock (master spec Open Item 1).
// Build against 180ms / 1,500 TPS; keep as config constants.
export const chainSpec = {
  blockTimeMs: 180,
  tpsCapacity: 1500,
} as const

export const DEMO_FOOTNOTE = 'Demonstration data — mainnet metrics go live at launch.'
