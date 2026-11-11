import { useCallback, useEffect, useState } from 'react'
import { RANGES, type Range } from '../components/RangeToggle'

// Where the reader is, kept in the address so a view can be linked to and
// survives a reload: `#<page>[/<anchor>][?range=<range>]`. The anchor is the
// id of an element on the page, such as a definition on Methodology.

export type PageId = 'overview' | 'markets' | 'risk' | 'archusd' | 'methodology'

export interface Route {
  page: PageId
  anchor: string | null
  /** The date range every daily chart shows. */
  range: Range
}

const PAGES: PageId[] = ['overview', 'markets', 'risk', 'archusd', 'methodology']
const DEFAULT_RANGE: Range = '30D'

export function parseHash(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?')
  const [page, anchor] = path.split('/')
  const range = new URLSearchParams(query).get('range')
  return {
    page: PAGES.includes(page as PageId) ? (page as PageId) : 'overview',
    anchor: anchor || null,
    range: RANGES.includes(range as Range) ? (range as Range) : DEFAULT_RANGE,
  }
}

/** The address of a page, an anchor on it where given, at a date range. */
export function hrefFor(page: PageId, range: Range, anchor?: string): string {
  return `#${page}${anchor ? `/${anchor}` : ''}${range === DEFAULT_RANGE ? '' : `?range=${range}`}`
}

/** The current route, following the address, and a way to change its range in place. */
export function useRoute(): [Route, (range: Range) => void] {
  const [route, setRoute] = useState(() => parseHash(window.location.hash))

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const setRange = useCallback((range: Range) => {
    setRoute((prev) => {
      window.history.replaceState(null, '', hrefFor(prev.page, range, prev.anchor ?? undefined))
      return { ...prev, range }
    })
  }, [])

  return [route, setRange]
}
