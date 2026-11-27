import type { Snapshot } from '../data/snapshot'
import { definitionEntries } from '../lib/definitions'
import PageHeader from './PageHeader'

/** The full definition of every live metric, as each is computed upstream:
 * laid out inside an Arch Prime flat card with edge-to-edge hairlines. */
export default function Methodology({ data }: { data: Snapshot }) {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Methodology"
        subtitle="How each metric on this dashboard is defined. Protocol figures are computed by Arch Prime Analytics from on-chain events; chain and token figures come from the Arch Explorer."
      />
      <div className="card max-w-3xl overflow-hidden">
        <dl className="divide-y divide-line">
          {definitionEntries(data).map((e) => (
            <div key={e.id} id={e.id} className="scroll-mt-24 px-5 py-5 sm:px-6">
              <dt className="font-heading text-[15.5px] font-medium tracking-[-0.01em] text-ink">{e.term}</dt>
              <dd className="mt-1.5 text-[13.5px] leading-[1.55] text-ink-2">{e.long}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
