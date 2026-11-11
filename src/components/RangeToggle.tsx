export type Range = '7D' | '30D' | '90D' | 'All'
export const RANGES: Range[] = ['7D', '30D', '90D', 'All']

interface Props {
  value: Range
  onChange: (r: Range) => void
  /** The ranges offered; all four unless given. */
  options?: Range[]
}

export default function RangeToggle({ value, onChange, options = RANGES }: Props) {
  return (
    <div className="segments" role="group" aria-label="Date range">
      {options.map((r) => (
        <button key={r} type="button" onClick={() => onChange(r)} aria-pressed={value === r} className="segment">
          {r}
        </button>
      ))}
    </div>
  )
}

/** Slice a daily series to its last N days. */
export function sliceRange<T>(rows: T[], range: Range): T[] {
  if (range === '7D') return rows.slice(-7)
  if (range === '30D') return rows.slice(-30)
  if (range === '90D') return rows.slice(-90)
  return rows
}
