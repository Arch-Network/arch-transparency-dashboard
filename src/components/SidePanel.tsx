import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react'

interface Props {
  /** Named by the `aria-controls` of the control that opens the panel. */
  id: string
  title: string
  subtitle?: string
  open: boolean
  onClose: () => void
  /** What opened the panel: focus returns to it when the panel closes. */
  trigger: RefObject<HTMLElement>
  /** Where the content comes from, closing the panel as it closes every other: a `SourceLine`. */
  source?: ReactNode
  children: ReactNode
}

/** Tab from the panel's last control goes to its first, and back: without this the browser's own toolbar is next. */
function keepFocusInside(e: KeyboardEvent<HTMLDialogElement>) {
  if (e.key !== 'Tab') return
  const stops = e.currentTarget.querySelectorAll<HTMLElement>('a[href], button')
  const from = stops[e.shiftKey ? 0 : stops.length - 1]
  if (document.activeElement !== from) return
  e.preventDefault()
  stops[e.shiftKey ? stops.length - 1 : 0].focus()
}

/**
 * Floating right-side drawer (desktop) / bottom sheet (phone) styled after
 * arch-prime's `.ap-drawer`. Native `<dialog>` preserves inert background,
 * Escape handling, focus return, and `panel-test.ts` DOM contracts.
 */
export default function SidePanel({ id, title, subtitle, open, onClose, trigger, source, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const el = dialog.current
    if (!el || el.open === open) return
    if (open) el.showModal()
    else el.close()
  }, [open])

  return (
    <dialog
      ref={dialog}
      id={id}
      aria-labelledby={titleId}
      className="side-panel"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClose={() => {
        trigger.current?.focus({ preventScroll: true })
        if (open) onClose()
      }}
      onKeyDown={keepFocusInside}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex shrink-0 items-start gap-3 border-b border-line px-5 pt-5 pb-4">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="font-heading text-[18px] font-medium leading-[1.25] tracking-[-0.015em] text-ink">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-[13px] leading-[1.4] text-ink-2">{subtitle}</p>}
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="-mr-1 -mt-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-pill text-ink-3 transition-colors duration-150 hover:bg-soft hover:text-ink"
        >
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
        {children}
        {source && <div className="-mx-5 mt-5 border-t border-line px-5 pt-4">{source}</div>}
      </div>
    </dialog>
  )
}
