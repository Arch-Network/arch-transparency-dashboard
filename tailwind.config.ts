import type { Config } from 'tailwindcss'

// Design tokens aligned with Arch-Network/arch-prime (apps/web-v2: app.css,
// explorer-cards.css, charts.css, v2.css). Light is default on :root, dark
// under [data-theme="dark"]. Existing utility names are preserved so sibling
// feature branches merge cleanly without breaking classes.
const token = (name: string) => `var(--ap-${name})`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        chrome: token('chrome'),
        canvas: token('canvas'),
        page: token('page'),
        card: token('card'),
        raised: token('raised'),
        float: token('float'),
        inset: token('inset'),
        soft: token('soft'),
        'soft-2': token('soft-2'),
        line: token('line'),
        'line-2': token('line-2'),
        ink: token('ink'),
        'ink-2': token('ink-2'),
        'ink-3': token('ink-3'),
        brand: token('brand'),
        'brand-2': token('brand-2'),
        'brand-soft': token('brand-soft'),
        up: token('up'),
        'up-soft': token('up-soft'),
        'up-solid': token('up-solid'),
        down: token('down'),
        'down-soft': token('down-soft'),
        'down-line': token('down-line'),
        'down-solid': token('down-solid'),
        warn: token('warn'),
        'warn-soft': token('warn-soft'),
        'warn-line': token('warn-line'),
        primary: token('primary'),
        'primary-ink': token('primary-ink'),
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Helvetica Neue', 'Arial', 'sans-serif'],
        heading: ['Inter Tight', 'Inter', 'system-ui', 'sans-serif'],
        num: ['IBM Plex Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        card: '20px',
        panel: '18px',
        inset: '14px',
        control: '12px',
        pill: '9999px',
      },
      boxShadow: {
        float: 'var(--ap-float-shadow)',
        seg: 'var(--ap-seg-shadow)',
      },
      transitionTimingFunction: {
        ap: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config
