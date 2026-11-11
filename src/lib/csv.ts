// A table of the figures on screen, as a file the reader can keep. Built in
// the browser from the snapshot already loaded: no request is made.

export type CsvRow = Record<string, string | number | null>

const cell = (v: string | number | null): string => {
  if (v === null) return ''
  const text = String(v)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Rows as CSV text, the columns in the order of the first row's keys. */
export function toCsv(rows: CsvRow[]): string {
  if (rows.length === 0) return ''
  const columns = Object.keys(rows[0])
  return [columns.join(','), ...rows.map((row) => columns.map((c) => cell(row[c])).join(','))].join('\n') + '\n'
}

export function downloadCsv(filename: string, rows: CsvRow[]): void {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
