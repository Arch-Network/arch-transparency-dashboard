import type { LegendProps } from 'recharts'

/** A chart's key, in the style of the one beside the value-locked chart: a
 * swatch in the series' color and its name in secondary text. Recharts' own
 * legend sets each name in its series' color, which some are too light for. */
export default function ChartLegend({ payload = [] }: Pick<LegendProps, 'payload'>) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 pb-2 text-xs text-ink-2">
      {payload.map((entry) => (
        <li key={String(entry.value)} className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2 shrink-0 rounded-[2px]" style={{ background: entry.color }} />
          {entry.value}
        </li>
      ))}
    </ul>
  )
}
