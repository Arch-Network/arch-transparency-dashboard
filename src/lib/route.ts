import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { RANGES, type Range } from '../components/RangeToggle'

// Where the reader is, kept in the address so a view can be linked to and
// survives a reload: `#<page>[/<anchor>][?range=<range>]`. The anchor is the
// id of an element on the page, such as a definition on Methodology, or of a
// side panel that opens over it.

export type PageId = 'overview' | 'markets' | 'risk' | 'archusd' | 'methodology'

export interface Route {
  page: PageId
  /** A place on the page to bring into view. */
  anchor: string | null
  /** The side panel open over the page. */
  panel: string | null
  /** The date range every daily chart shows. */
  range: Range
}

const PAGES: PageId[] = ['overview', 'markets', 'risk', 'archusd', 'methodology']

/** Anchors that open a side panel on their page rather than naming a place on it. */
const PANELS: Record<string, PageId> = { 'about-ausd': 'archusd', 'about-abtc': 'risk' }

/** `history.state` of an entry the panel's own button added, which closing the panel steps back out of. */
const OPENED_HERE = 'panel-opened-here'
const DEFAULT_RANGE: Range = '30D'

export function parseHash(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?')
  const [page, anchor] = path.split('/')
  const range = new URLSearchParams(query).get('range')
  const panel = anchor !== undefined && PANELS[anchor] === page
  return {
    page: PAGES.includes(page as PageId) ? (page as PageId) : 'overview',
    anchor: panel ? null : anchor || null,
    panel: panel ? anchor : null,
    range: RANGES.includes(range as Range) ? (range as Range) : DEFAULT_RANGE,
  }
}

/** The address of a page, an anchor on it where given, at a date range. */
export function hrefFor(page: PageId, range: Range, anchor?: string): string {
  return `#${page}${anchor ? `/${anchor}` : ''}${range === DEFAULT_RANGE ? '' : `?range=${range}`}`
}

/** Opens a side panel over the page on screen, as a step in the history: Back closes it. */
export function openPanel(id: string) {
  const { page, range } = parseHash(window.location.hash)
  window.location.hash = hrefFor(page, range, id)
  window.history.replaceState(OPENED_HERE, '')
}

/** True between asking the browser to step back and its doing so, so a second request to close is not a second step. */
let steppingBack = false

/** Closes the side panel, leaving the address on the page itself, so a reload
 * does not reopen it. A panel its button opened is stepped back out of, and
 * Forward reopens it; one arrived at by a link has its entry rewritten. */
export function closePanel() {
  const { page, range, panel } = parseHash(window.location.hash)
  if (panel === null || steppingBack) return
  if (window.history.state === OPENED_HERE) {
    steppingBack = true
    window.addEventListener('popstate', () => (steppingBack = false), { once: true })
    return window.history.back()
  }
  window.history.replaceState(null, '', hrefFor(page, range))
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

/** The side panel the address has open, for the pages beneath `App`. */
export const OpenPanel = createContext<string | null>(null)

/** Whether the side panel `id` is open, and the ways to open and close it. */
export function usePanel(id: string) {
  const open = useContext(OpenPanel) === id
  return { open, show: () => openPanel(id), close: closePanel }
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
      window.history.replaceState(window.history.state, '', hrefFor(prev.page, range, prev.panel ?? prev.anchor ?? undefined))
      return { ...prev, range }
    })
  }, [])

  return [route, setRange]
}
