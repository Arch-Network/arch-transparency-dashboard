import { useEffect, type RefObject } from 'react'

/** While `open`, closes a popover on a press outside `root` or on Escape,
 * which also returns focus to `trigger`. */
export function useDismiss(
  open: boolean,
  close: () => void,
  root: RefObject<HTMLElement>,
  trigger: RefObject<HTMLElement>,
) {
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      close()
      trigger.current?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close, root, trigger])
}
