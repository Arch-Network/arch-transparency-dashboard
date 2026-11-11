import type { Config } from 'tailwindcss'

// Token names from the Arch o11y dashboard. The hex values are the --ap-*
// custom properties in src/index.css (dark by default, light under
// [data-theme="light"]); src/theme.ts points charts at the same properties.
const token = (name: string) => `var(--ap-${name})`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: token('page'),
        card: token('card'),
        raised: token('raised'),
        inset: token('inset'),
        soft: token('soft'),
        'soft-2': token('soft-2'),
        line: token('line'),
        'line-2': token('line-2'),
        ink: token('ink'),
        'ink-2': token('ink-2'),
        'ink-3': token('ink-3'),
        brand: token('brand'),
        up: token('up'),
        'up-soft': token('up-soft'),
        down: token('down'),
        'down-soft': token('down-soft'),
        'down-line': token('down-line'),
        warn: token('warn'),
        'warn-soft': token('warn-soft'),
        'warn-line': token('warn-line'),
        primary: token('primary'),
        'primary-ink': token('primary-ink'),
      },
      fontFamily: {
        sans: ['Inter Tight', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        card: '8px',
        control: '6px',
      },
    },
  },
  plugins: [],
} satisfies Config
