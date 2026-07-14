import { useState } from 'react'

interface Props {
  text: string
  onMethodology: () => void
}

/** Info tooltip for KPI/metric labels. Copy comes verbatim from master spec §4;
 * every tooltip ends with the Methodology link (build handoff §3). */
export default function InfoTooltip({ text, onMethodology }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="Metric definition"
        onClick={() => setOpen((v) => !v)}
        className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-ink-4/50 text-[9px] leading-none text-ink-4 hover:border-orange hover:text-orange"
      >
        i
      </button>
      {open && (
        <span className="absolute left-1/2 top-5 z-30 w-64 -translate-x-1/2 rounded-lg border border-line bg-card p-3 text-left text-xs font-normal normal-case leading-relaxed text-ink shadow-lg">
          {text}{' '}
          <button
            type="button"
            className="text-orange underline underline-offset-2"
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
