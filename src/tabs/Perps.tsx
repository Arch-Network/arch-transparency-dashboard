import type { Snapshot } from '../data/snapshot'
import PageHeader from '../components/PageHeader'
import Panel from '../components/Panel'
import { EmptyState } from '../components/ui'
import ExchangeHealth from './perps/ExchangeHealth'
import FundingHistory from './perps/FundingHistory'
import MarketsTable from './perps/MarketsTable'
import OpenInterestBreakdown from './perps/OpenInterestBreakdown'
import Summary from './perps/Summary'

/** Perpetual futures on Arch Prime: open interest, 24h volume, funding rates,
 * maker equity & margin backing, on-chain exchange vault state, and every live market. */
export default function Perps({ data }: { data: Snapshot }) {
  const { perps, meta } = data

  return (
    <div className="space-y-4">
      <PageHeader
        title="Perps"
        subtitle="Perpetual futures on Arch Prime: open interest, 24-hour volume, funding rates, maker backing and on-chain vault collateral"
      />
      {!perps ? (
        <Panel id="perps-unavailable" title="Perps data unavailable">
          <EmptyState
            body={
              meta.perps_api_url
                ? 'The Arch Perps engine did not answer at the last refresh. Figures will return automatically when it answers again.'
                : 'The Arch Perps engine URL is not configured for this deployment.'
            }
          />
        </Panel>
      ) : (
        <>
          <Summary perps={perps} />
          <ExchangeHealth perps={perps} meta={meta} />
          <OpenInterestBreakdown perps={perps} meta={meta} />
          <FundingHistory perps={perps} meta={meta} />
          <MarketsTable perps={perps} meta={meta} />
        </>
      )}
    </div>
  )
}
