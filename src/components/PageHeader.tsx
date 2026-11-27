import type { ReactNode } from 'react'
import { useRange } from '../lib/range'
import RangeToggle from './RangeToggle'

interface Props {
  title: string
  subtitle: string
  /** A quiet control beside the title: the way to what the page keeps off its body. */
  action?: ReactNode
  /** Show a page-level date range selector beside the title. */
  withRange?: boolean
}

/** Crisp page title block directly on the canvas — tight, scannable, editorial. */
export default function PageHeader({ title, subtitle, action, withRange }: Props) {
  const { range, setRange, options } = useRange()
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 pb-0.5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="font-heading text-[22px] font-semibold leading-[1.2] tracking-[-0.02em] text-ink sm:text-[24px]">
            {title}
          </h2>
          {action}
        </div>
        <p className="mt-0.5 max-w-3xl text-[13px] leading-[1.45] text-ink-2">{subtitle}</p>
      </div>
      {withRange && (
        <div className="flex items-center gap-2 text-[12px] font-medium text-ink-3">
          <span className="hidden sm:inline">Range</span>
          <RangeToggle value={range} onChange={setRange} options={options} />
        </div>
      )}
    </div>
  )
}
