import type { ReactElement } from 'react'
import { ResponsiveContainer } from 'recharts'

// Tailwind reads class names from the source, so each height is spelled out.
const HEIGHTS = {
  /** The chart a section leads with. */
  tall: 'h-[220px] sm:h-[320px]',
  regular: 'h-[200px] sm:h-[240px]',
  /** One of two charts stacked on a shared date axis. */
  short: 'h-[152px] sm:h-[172px]',
  /** As `tall`, growing to fill a panel stretched to its neighbour's height. */
  fill: 'h-[220px] sm:h-full sm:min-h-[320px]',
}

interface Props {
  size?: keyof typeof HEIGHTS
  children: ReactElement
}

/** A chart at the height its place calls for: shorter on a phone, where the page is one column. */
export default function ChartBox({ size = 'regular', children }: Props) {
  return (
    <div className={`relative ${HEIGHTS[size]}`}>
      {/* Out of flow, so the chart takes the box's size and never sets it. */}
      <div className="absolute inset-0">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
