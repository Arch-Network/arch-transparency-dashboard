import { createContext, useContext } from 'react'
import type { Range } from '../components/RangeToggle'
import type { PageId } from './route'
import { hrefFor } from './route'

// One date range for the whole dashboard: every daily chart reads it from
// here, and every link between pages carries it.

interface RangeState {
  range: Range
  setRange: (range: Range) => void
  /** The ranges worth offering for the history there is. */
  options: Range[]
}

const RangeContext = createContext<RangeState>({ range: '30D', setRange: () => {}, options: ['7D', '30D', 'All'] })

export const RangeProvider = RangeContext.Provider

export const useRange = (): RangeState => useContext(RangeContext)

/** The address of a page at the range in force. */
export function usePageHref(): (page: PageId, anchor?: string) => string {
  const { range } = useRange()
  return (page, anchor) => hrefFor(page, range, anchor)
}

/** 90 days is offered once there is more history than that to cut from. */
export function rangeOptions(daysOfHistory: number): Range[] {
  return daysOfHistory > 90 ? ['7D', '30D', '90D', 'All'] : ['7D', '30D', 'All']
}
