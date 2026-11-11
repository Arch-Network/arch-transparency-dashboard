import type { Snapshot } from '../data/snapshot'
import { definitionEntries } from '../lib/definitions'
import PageHeader from './PageHeader'

/** The full definition of every live metric, as each is computed upstream:
 * one ruled list on the page's left edge, at a width to read. Each entry sits
 * under an anchor, so the short form beside a number can link to it. */
export default function Methodology({ data }: { data: Snapshot }) {
  return (
    <div className="space-y-3">
      <PageHeader
        title="Methodology"
        subtitle="How each metric on this dashboard is defined. Protocol figures are computed by Arch Prime Analytics from on-chain events; chain and token figures come from the Arch Explorer."
      />
      <dl className="max-w-[600px] divide-y divide-line border-y border-line">
        {definitionEntries(data).map((e) => (
          <div key={e.id} id={e.id} className="scroll-mt-28 py-4">
            <dt className="text-[15px] font-medium">{e.term}</dt>
            <dd className="mt-1 text-[14px] leading-normal text-ink-2">{e.long}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
