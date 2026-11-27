import { useCallback, useRef, useState, type ReactNode } from 'react'
import type { Definition } from '../lib/definitions'
import { usePageHref } from '../lib/range'
import { useDismiss } from '../lib/useDismiss'

interface Props {
  title?: string
  text: string
  /** What follows the text: the way on to the full account. */
  children?: ReactNode
}

/** Widest the panel gets, and the gap it keeps from the page edge, in px. */
const PANEL_WIDTH = 340
const PAGE_GAP = 16

/**
 * Floating explanation card behind a quiet (i) trigger next to a label,
 * matching arch-prime's structured TipCard popover (opaque floating surface,
 * diffuse shadow, no outline). Click, Enter or Space toggle; Escape or outside
 * click close.
 */
export default function InfoTooltip({ title, text, children }: Props) {
  const [shift, setShift] = useState<number | null>(null)
  const root = useRef<HTMLSpanElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const open = shift !== null
  const close = useCallback(() => setShift(null), [])
  useDismiss(open, close, root, button)

  const show = (trigger: HTMLElement) => {
    const page = document.documentElement.clientWidth
    const width = Math.min(PANEL_WIDTH, page - 2 * PAGE_GAP)
    setShift(Math.min(0, page - PAGE_GAP - width - trigger.getBoundingClientRect().left))
  }

  return (
    <span
      ref={root}
      className="info relative -my-1.5 ml-1 inline-flex align-middle"
      onBlur={(e) => {
        if (e.relatedTarget && !root.current?.contains(e.relatedTarget)) close()
      }}
    >
      <button
        ref={button}
        type="button"
        aria-label="Metric definition"
        aria-expanded={open}
        onClick={(e) => (open ? close() : show(e.currentTarget))}
        className="inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-ink-3 transition-colors duration-150 hover:bg-soft-2 hover:text-ink aria-expanded:bg-soft-2 aria-expanded:text-ink"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 shrink-0">
          <circle cx="8" cy="8" r="6.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 7v3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="4.75" r="0.85" fill="currentColor" />
        </svg>
      </button>
      {shift !== null && (
        <span
          role="region"
          aria-label="Metric definition"
          style={{ left: shift }}
          className="popover absolute top-full z-40 mt-2 block w-[min(21.25rem,calc(100vw-2rem))] whitespace-normal text-left font-sans text-[13px] font-normal normal-case leading-[1.45] tracking-normal text-ink-2"
        >
          {title && <span className="mb-1 block font-heading text-[13.5px] font-medium text-ink">{title}</span>}
          <span className="block">{text}</span>
          {children && (
            <span className="mt-2.5 block border-t border-line pt-2 text-[12.5px]">{children}</span>
          )}
        </span>
      )}
    </span>
  )
}

/** A definition's short form beside its label, with the way to the full one. */
export function DefinitionTip({ definition }: { definition: Definition }) {
  const href = usePageHref()
  return (
    <InfoTooltip title={definition.term} text={definition.short}>
      <a className="link whitespace-nowrap font-medium text-ink" href={href('methodology', definition.id)}>
        Full definition →
      </a>
    </InfoTooltip>
  )
}
