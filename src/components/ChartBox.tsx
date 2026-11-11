import type { ReactElement } from 'react'
import { ResponsiveContainer } from 'recharts'

// Tailwind reads class names from the source, so each height is spelled out.
const HEIGHTS = {
  /** The chart a section leads with. */
  tall: 'h-[220px] sm:h-[320px]',
  regular: 'h-[200px] sm:h-[240px]',
  /** One of two charts stacked on a shared date axis. */
  short: 'h-[152px] sm:h-[172px]',
}

interface Props {
  size?: keyof typeof HEIGHTS
  children: ReactElement
}

/** A chart at the height its place calls for: shorter on a phone, where the page is one column. */
export default function ChartBox({ size = 'regular', children }: Props) {
  return (
    <div className={HEIGHTS[size]}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  )
}
