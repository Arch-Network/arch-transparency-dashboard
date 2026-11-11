import { useCallback, useRef, useState, type ReactNode } from 'react'
import type { Definition } from '../lib/definitions'
import { usePageHref } from '../lib/range'
import { useDismiss } from '../lib/useDismiss'

interface Props {
  text: string
  /** What follows the text: the way on to the full account. */
  children?: ReactNode
}

/** Widest the panel gets, and the gap it keeps from the page edge, in px. */
const PANEL_WIDTH = 352
const PAGE_GAP = 16

/** A short explanation behind an (i) next to a label. Click, Enter or Space
 * toggle the panel; Escape (which returns focus), a click outside or focus
 * moving elsewhere close it. */
export default function InfoTooltip({ text, children }: Props) {
  // Offset of the panel from the trigger's left edge while open; null while closed.
  const [shift, setShift] = useState<number | null>(null)
  const root = useRef<HTMLSpanElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const open = shift !== null
  const close = useCallback(() => setShift(null), [])
  useDismiss(open, close, root, button)

  /** Lines the panel up with the trigger, pulled back where that would run off the right of the page. */
  const show = (trigger: HTMLElement) => {
    const page = document.documentElement.clientWidth
    const width = Math.min(PANEL_WIDTH, page - 2 * PAGE_GAP)
    setShift(Math.min(0, page - PAGE_GAP - width - trigger.getBoundingClientRect().left))
  }

  return (
    <span
      ref={root}
      // Sits in the label's text line without making it taller than a label that has no icon.
      className="info relative -my-1.5 ml-1 inline-flex align-middle"
      onBlur={(e) => {
        // Only when focus lands somewhere else: a click on the panel's own text or link moves it nowhere.
        if (e.relatedTarget && !root.current?.contains(e.relatedTarget)) close()
      }}
    >
      <button
        ref={button}
        type="button"
        aria-label="Metric definition"
        aria-expanded={open}
        onClick={(e) => (open ? close() : show(e.currentTarget))}
        className="inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-ink-3 hover:bg-soft-2 hover:text-ink aria-expanded:bg-soft-2 aria-expanded:text-ink"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 shrink-0">
          <circle cx="8" cy="8" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 7v4.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="4.75" r="0.9" fill="currentColor" />
        </svg>
      </button>
      {shift !== null && (
        <span
          role="region"
          aria-label="Metric definition"
          style={{ left: shift }}
          className="absolute top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] whitespace-normal rounded-card border border-line-2 bg-raised p-3 text-left text-[13px] font-normal normal-case leading-[1.45] tracking-normal text-ink-2"
        >
          {text} {children}
        </span>
      )}
    </span>
  )
}

/** A definition's short form beside its label, with the way to the full one. */
export function DefinitionTip({ definition }: { definition: Definition }) {
  const href = usePageHref()
  return (
    <InfoTooltip text={definition.short}>
      <a className="link whitespace-nowrap text-ink" href={href('methodology', definition.id)}>
        Full definition
      </a>
    </InfoTooltip>
  )
}
