export type Range = '7D' | '30D' | '90D' | 'All'
export const RANGES: Range[] = ['7D', '30D', '90D', 'All']

interface Props {
  value: Range
  onChange: (r: Range) => void
}

export default function RangeToggle({ value, onChange }: Props) {
  return (
    <div className="flex gap-0.5 rounded-lg border border-line bg-page p-0.5 font-mono text-[11px]">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={
            'rounded-md px-2.5 py-1 font-medium transition-colors ' +
            (value === r ? 'bg-navy text-white' : 'text-ink-3 hover:text-ink')
          }
        >
          {r}
        </button>
      ))}
    </div>
  )
}

/** Slice a daily series by range (mock covers 30 days; 90D/All return everything). */
export function sliceRange<T>(rows: T[], range: Range): T[] {
  if (range === '7D') return rows.slice(-7)
  if (range === '30D') return rows.slice(-30)
  return rows
}
