import type { Snapshot } from '../data/snapshot'
import PageHeader from '../components/PageHeader'
import Activity from './overview/Activity'
import Capital from './overview/Capital'
import Network from './overview/Network'
import Products from './overview/Products'
import RiskSnapshot from './overview/RiskSnapshot'
import Summary from './overview/Summary'
import Verification from './overview/Verification'

/** The protocol at a glance: four figures, then capital, products, activity,
 * risk, the chain it runs on, and how to check all of it. */
export default function Overview({ data }: { data: Snapshot }) {
  return (
    <div className="space-y-3">
      <PageHeader
        title="Overview"
        subtitle="Value locked, trading and lending on Arch Prime, read from the chain"
        withRange
      />
      <Summary data={data} />
      <Capital data={data} />
      <Products data={data} />
      <Activity data={data} />
      <RiskSnapshot data={data} />
      <Network data={data} />
      <Verification data={data} />
    </div>
  )
}
