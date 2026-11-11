import type { Snapshot } from '../data/snapshot'
import { definitionEntries } from '../lib/definitions'

interface Props {
  data: Snapshot
  onBack: () => void
}

/** Definitions of the live metrics, as each is computed upstream. */
export default function Methodology({ data, onBack }: Props) {
  return (
    <div className="mx-auto max-w-3xl">
      <button type="button" onClick={onBack} className="btn mb-4">
        ← Back to dashboard
      </button>
      <h2 className="text-[26px] font-medium leading-tight">Methodology</h2>
      <p className="mt-1 text-[13px] text-ink-2">
        How each metric on this dashboard is defined. Protocol figures are computed by Arch Prime Analytics from
        on-chain events; chain and token figures come from the Arch Explorer.
      </p>
      <dl className="mt-4 space-y-3">
        {definitionEntries(data).map((e) => (
          <div key={e.term} className="card p-4">
            <dt className="text-[15px] font-medium">{e.term}</dt>
            <dd className="mt-1 text-[13px] leading-[1.45] text-ink-2">{e.definition}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
