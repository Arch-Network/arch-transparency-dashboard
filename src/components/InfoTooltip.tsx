import { useEffect, useRef, useState } from 'react'

interface Props {
  text: string
  onMethodology: () => void
}

/** Widest the panel gets, and the gap it keeps from the page edge, in px. */
const PANEL_WIDTH = 352
const PAGE_GAP = 16

/** Definition of a KPI/metric behind an (i) next to its label. Click, Enter or
 * Space toggle the panel; Escape (which returns focus), a click outside or
 * focus moving elsewhere close it. Copy comes verbatim from master spec §4;
 * every tooltip ends with the Methodology link (build handoff §3). */
export default function InfoTooltip({ text, onMethodology }: Props) {
  // Offset of the panel from the trigger's left edge while open; null while closed.
  const [shift, setShift] = useState<number | null>(null)
  const root = useRef<HTMLSpanElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const open = shift !== null

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setShift(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setShift(null)
      button.current?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

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
        if (e.relatedTarget && !root.current?.contains(e.relatedTarget)) setShift(null)
      }}
    >
      <button
        ref={button}
        type="button"
        aria-label="Metric definition"
        aria-expanded={open}
        onClick={(e) => (open ? setShift(null) : show(e.currentTarget))}
        className="inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-ink-2 hover:bg-soft-2 hover:text-ink aria-expanded:bg-soft-2 aria-expanded:text-ink"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 shrink-0">
          <circle cx="8" cy="8" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M8 7v4.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="8" cy="4.75" r="0.9" fill="currentColor" />
        </svg>
      </button>
      {shift !== null && (
        <span
          role="region"
          aria-label="Metric definition"
          style={{ left: shift }}
          className="absolute top-full z-40 mt-1.5 w-[min(22rem,calc(100vw-2rem))] whitespace-normal rounded-card border border-line-2 bg-raised p-3 text-left text-[13px] font-normal normal-case leading-[1.45] tracking-normal text-ink-2"
        >
          {text}{' '}
          <button
            type="button"
            className="link text-ink"
            onClick={(e) => {
              e.stopPropagation()
              onMethodology()
            }}
          >
            Definitions: see Methodology.
          </button>
        </span>
      )}
    </span>
  )
}
