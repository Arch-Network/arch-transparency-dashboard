import type { LegendProps } from 'recharts'

/** Crisp centered bottom chart legend (echoing 9031wyb82's clean chart rhythm). */
export default function ChartLegend({ payload = [] }: Pick<LegendProps, 'payload'>) {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-2.5 text-[11.5px] font-medium text-ink-2">
      {payload.map((entry) => (
        <li key={String(entry.value)} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block size-2 shrink-0 rounded-[2px]"
            style={{ background: entry.color }}
          />
          {entry.value}
        </li>
      ))}
    </ul>
  )
}
