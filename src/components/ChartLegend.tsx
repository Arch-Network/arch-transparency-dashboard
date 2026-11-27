import type { LegendProps } from 'recharts'

/** Chart key styled after arch-prime's `.ap-legend`: crisp rounded dot swatches
 * paired with calm secondary labels. */
export default function ChartLegend({ payload = [] }: Pick<LegendProps, 'payload'>) {
  return (
    <ul className="flex flex-wrap items-center justify-start gap-x-5 gap-y-1.5 pb-3 text-[12px] font-medium text-ink-2">
      {payload.map((entry) => (
        <li key={String(entry.value)} className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block size-2 shrink-0 rounded-full"
            style={{ background: entry.color }}
          />
          {entry.value}
        </li>
      ))}
    </ul>
  )
}
