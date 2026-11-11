// Number formatting helpers. Headline figures and prose are compact
// (`fmtUsd`); a column of amounts in a table or list takes one format for all
// of its rows (`usdColumn`). Tabular numerals are enforced via CSS
// (font-variant-numeric: tabular-nums).

export function fmtUsd(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K'
  // Below $1,000 the cents carry the information: early mainnet fees are a
  // few dollars a day.
  return n === 0 ? '$0' : '$' + n.toFixed(2)
}

/** A column's formatter: an amount in the column's format, with a plus or
 * minus before it where it is a change. */
export type UsdFormat = (n: number, signed?: boolean) => string

/** One format for a column of USD amounts, decided from all of its values:
 * whole dollars with thousands separators (`$1,612`, `$55`), or dollars and
 * cents where every amount is under $1,000. Missing amounts take no part in
 * the decision. */
export function usdColumn(amounts: (number | null | undefined)[]): UsdFormat {
  const digits = amounts.every((n) => n == null || Math.abs(n) < 1000) ? 2 : 0
  return (n, signed = false) =>
    (n < 0 ? '−' : signed ? '+' : '') +
    '$' +
    Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function fmtNum(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return Math.round(n).toLocaleString('en-US')
  return String(Math.round(n))
}

export function fmtToken(n: number, symbol: string): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: Math.abs(n) < 100 ? 4 : 0 }) + ' ' + symbol
}

export function fmtPct(n: number, digits = 1): string {
  return n.toFixed(digits) + '%'
}

export function fmtDateShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export function fmtTs(iso: string): string {
  const d = new Date(iso)
  return d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
}

/** A change in USD, signed: `+$1.6K`, `−$240.00`. */
export function fmtUsdChange(n: number): string {
  return (n < 0 ? '−' : '+') + fmtUsd(Math.abs(n))
}

/** Enough digits to tell a share price from $1, without cents on a five-figure price. */
export function fmtPrice(usd: number): string {
  const digits = usd >= 1000 ? 0 : usd >= 10 ? 2 : 4
  return '$' + usd.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** The time of day of a timestamp, to the minute: `13:10 UTC`. */
export function fmtClock(iso: string): string {
  return new Date(iso).toISOString().slice(11, 16) + ' UTC'
}

/** A moment in words: `13:10 UTC on 11 November 2026`. */
export function fmtMoment(iso: string): string {
  const day = new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  return `${fmtClock(iso)} on ${day}`
}

/** A span of time in its largest unit: `40 s`, `12 min`, `3 h`, `2 d`. */
export function fmtSpan(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 90) return `${s} s`
  if (s < 90 * 60) return `${Math.round(s / 60)} min`
  if (s < 36 * 3600) return `${Math.round(s / 3600)} h`
  return `${Math.round(s / 86_400)} d`
}
