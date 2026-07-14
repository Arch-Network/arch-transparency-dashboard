import { methodologyEntries } from '../lib/tooltips'
import DemoDataFootnote from './DemoDataFootnote'

interface Props {
  onBack: () => void
}

/** Methodology stub page rendering the master §4 metric definitions
 * (content pending final review — master spec Open Item 7). */
export default function Methodology({ onBack }: Props) {
  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 rounded-lg border border-line bg-card px-4 py-2 text-xs font-medium text-ink-2 hover:border-orange hover:text-orange"
      >
        ← Back to dashboard
      </button>
      <h2 className="text-2xl font-semibold text-ink">Methodology</h2>
      <p className="mt-2 text-sm text-ink-3">
        Metric definitions used across this dashboard. This page is pending final review before public launch.
      </p>
      <dl className="mt-8 space-y-4">
        {methodologyEntries.map((e) => (
          <div key={e.term} className="card p-5">
            <dt className="text-[15px] font-semibold text-ink">{e.term}</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-ink-2">{e.definition}</dd>
          </div>
        ))}
      </dl>
      <DemoDataFootnote />
    </div>
  )
}
