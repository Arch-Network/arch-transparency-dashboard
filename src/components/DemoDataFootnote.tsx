import { DEMO_FOOTNOTE } from '../theme'

/** Mandatory on every tab (build handoff §5.3). */
export default function DemoDataFootnote() {
  return (
    <p className="mt-8 border-t border-line-faint pt-4 text-center text-xs text-ink-4">
      {DEMO_FOOTNOTE}
    </p>
  )
}
