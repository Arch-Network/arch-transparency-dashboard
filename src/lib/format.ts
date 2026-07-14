// Number formatting helpers. All USD figures compact by default; tabular
// numerals are enforced via CSS (font-variant-numeric: tabular-nums).

export function fmtUsd(n: number, opts?: { full?: boolean }): string {
  if (opts?.full) return '$' + Math.round(n).toLocaleString('en-US')
  const abs = Math.abs(n)
  if (abs >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K'
  return '$' + Math.round(n).toLocaleString('en-US')
}

export function fmtNum(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return Math.round(n).toLocaleString('en-US')
  return String(Math.round(n))
}

export function fmtBtc(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' BTC'
}

export function fmtPct(n: number, digits = 1): string {
  return n.toFixed(digits) + '%'
}

export function fmtDelta(pct: number, digits = 1): string {
  const sign = pct >= 0 ? '+' : ''
  return sign + pct.toFixed(digits) + '%'
}

export function fmtRatio(n: number): string {
  return n.toFixed(1) + '×'
}

export function fmtDateShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export function fmtTs(iso: string): string {
  const d = new Date(iso)
  return d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
}
