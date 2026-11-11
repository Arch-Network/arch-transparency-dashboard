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
} as const
