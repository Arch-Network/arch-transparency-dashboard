import { useRange } from '../lib/range'
import RangeToggle from './RangeToggle'

interface Props {
  title: string
  subtitle: string
  /** The page has daily charts: show the one date range they all follow. */
  withRange?: boolean
}

/** A page's title and what it covers, with the shared date range where the page has daily charts. */
export default function PageHeader({ title, subtitle, withRange }: Props) {
  const { range, setRange, options } = useRange()
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-1">
      <div className="min-w-0">
        <h2 className="text-[26px] font-medium leading-tight">{title}</h2>
        <p className="mt-1 max-w-3xl text-[13px] text-ink-2">{subtitle}</p>
      </div>
      {withRange && (
        <div className="flex items-center gap-2 text-[13px] text-ink-2">
          <span>Charts show</span>
          <RangeToggle value={range} onChange={setRange} options={options} />
        </div>
      )}
    </div>
  )
}
