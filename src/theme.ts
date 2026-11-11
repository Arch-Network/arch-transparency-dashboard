// Arch transparency dashboard design tokens for charts and inline styles. The
// values are the --ap-* custom properties in src/index.css (the Arch o11y
// dashboard's tokens: dark by default, light under [data-theme="light"]), so
// they follow the theme; tailwind.config.ts names the same properties. Never
// inline hex in components.

const token = (name: string) => `var(--ap-${name})`

// On a chart or a bar, a color always names a product: the same one on every
// page. Whatever is not one product (the whole chain, a token's transfers, the
// market maker's fills, a total across venues) is drawn in neutral. Where a
// second neutral series is needed, tell it apart by line weight or dash, or
// by `colors.ink` and `colors.ink2`, never by another hue.
export const productColors = {
  lend: token('series-1'), // Arch Lend
  vaults: token('series-2'), // Vaults
  swap: token('series-3'), // Arch Swap pools
  neutral: token('series-8'), // not a product
} as const

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
} as const
