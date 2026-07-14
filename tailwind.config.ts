import type { Config } from 'tailwindcss'

// Design tokens per the designer reference file (see src/theme.ts — the single
// source of hex values; these literals must match it exactly).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: '#FDFCF7',
        card: '#FFFFFF',
        line: '#EAE7DE',
        'line-faint': '#F1EEE4',
        ink: '#17170F',
        'ink-2': '#55554C',
        'ink-3': '#77776C',
        'ink-4': '#8A8A7E',
        orange: '#EC641D',
        navy: '#1F2B4D',
        gold: '#C79A3A',
        slate: '#7A86A8',
        green: '#1A8F4C',
        red: '#B03A2E',
        chip: '#FBE9CF',
        'chip-text': '#8A5A1E',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'Arial', 'Helvetica', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
} satisfies Config
