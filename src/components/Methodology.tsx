import type { Snapshot } from '../data/snapshot'
import { definitionEntries } from '../lib/definitions'

/** The full definition of every live metric, as each is computed upstream.
 * Each sits under an anchor, so the short form beside a number can link to it. */
export default function Methodology({ data }: { data: Snapshot }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-[26px] font-medium leading-tight">Methodology</h2>
      <p className="mt-1 text-[13px] text-ink-2">
        How each metric on this dashboard is defined. Protocol figures are computed by Arch Prime Analytics from
        on-chain events; chain and token figures come from the Arch Explorer.
      </p>
      <dl className="mt-4 space-y-3">
        {definitionEntries(data).map((e) => (
          <div key={e.id} id={e.id} className="card scroll-mt-28 p-4">
            <dt className="text-[15px] font-medium">{e.term}</dt>
            <dd className="mt-1 text-[14px] leading-normal text-ink-2">{e.long}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
