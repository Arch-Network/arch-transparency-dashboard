import type { Snapshot } from '../data/snapshot'
import PageHeader from '../components/PageHeader'
import Activity from './overview/Activity'
import Capital from './overview/Capital'
import MarketBreakdown from './overview/MarketBreakdown'
import Network from './overview/Network'
import Products from './overview/Products'
import RiskSnapshot from './overview/RiskSnapshot'
import Summary from './overview/Summary'
import TheyaHoldings from './overview/TheyaHoldings'
import Verification from './overview/Verification'

/**
 * Overview — 9031wyb82's scannable, visual-first data hierarchy elevated with
 * Arch Prime's design system, seamlessly integrating Arch Perps and Theya BTC holdings:
 * 1) Hero 4-card KPI strip + compact secondary MetricsBar
 * 2) 2-col Charts: TVL Over Time | Daily Volume (with cumulative overlay)
 * 3) 2-col Charts: Daily Swap Fees | Interest Earned by Lenders
 * 4) 2-col Breakdown: Supplied & Borrowed by Asset | Available Liquidity
 * 5) 2-col Ecosystem: Theya Bitcoin Holdings | Products & Venues (incl. Perps)
 * 6) Compact Risk Snapshot, Live Chain Activity (when Explorer answers), Verification & CSVs
 */
export default function Overview({ data }: { data: Snapshot }) {
  const showTheya = Boolean(data.theya || data.meta.degraded.includes('theya'))

  return (
    <div className="space-y-4">
      <PageHeader
        title="Overview"
        subtitle="Value locked, trading, lending and perpetuals on Arch Prime, read from the chain."
      />
      <Summary data={data} />
      <Capital data={data} />
      <Activity data={data} />
      <MarketBreakdown data={data} />
      {showTheya ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <TheyaHoldings data={data} />
          <Products data={data} compact />
        </div>
      ) : (
        <Products data={data} />
      )}
      <RiskSnapshot data={data} />
      <Network data={data} />
      <Verification data={data} />
    </div>
  )
}
