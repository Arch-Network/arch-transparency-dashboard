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

/** Reading matter kept off the page: a modal panel in from the right, or a
 * sheet up from the bottom on a phone (`.side-panel` in index.css). A native
 * dialog: it takes focus when it opens and keeps it, the page behind is inert
 * and does not scroll, and Escape, the close button or a press outside close
 * it. Only its content scrolls. */
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
      // Escape asks; the answer is the owner's, so the address and the panel stay in step.
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClose={() => {
        trigger.current?.focus({ preventScroll: true })
        // The browser can close a dialog over a refused Escape: follow it.
        if (open) onClose()
      }}
      onKeyDown={keepFocusInside}
      // A press on the scrim lands on the dialog itself; one inside lands on its content.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex shrink-0 items-start gap-3 border-b border-line py-3 pl-4 pr-3">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-[15px] font-medium">
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-ink-2">{subtitle}</p>}
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="-mt-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-control text-ink-2 hover:bg-soft-2 hover:text-ink"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {children}
        {source && <div className="mt-4 border-t border-line pt-3">{source}</div>}
      </div>
    </dialog>
  )
}
