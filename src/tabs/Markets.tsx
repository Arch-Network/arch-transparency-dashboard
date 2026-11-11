import type { Snapshot } from '../data/snapshot'
import MarketRates from '../components/MarketRates'
import MarketsTable from '../components/MarketsTable'
import PageHeader from '../components/PageHeader'
import Panel from '../components/Panel'
import SourceLine from '../components/SourceLine'
import { definitions, liveDefinitions } from '../lib/definitions'
import { analyticsLinks } from '../lib/links'
import Pools from './markets/Pools'
import Vaults from './markets/Vaults'

/** Product by product: Arch Lend's markets and their rates, the Swap pools, the vaults. */
export default function Markets({ data }: { data: Snapshot }) {
  const { lend, meta } = data
  const withRates = lend.markets.filter((m) => m.rates_daily.length > 0)
  return (
    <div className="space-y-3">
      <PageHeader
        title="Markets"
        subtitle="Arch Lend markets, Arch Swap pools and vaults: balances, prices, rates and the last 24 hours."
        withRange={withRates.length > 0}
      />
      <Panel
        id="lend"
        title="Arch Lend markets"
        subtitle="Every market, largest first, with the price its balances are valued at."
        definition={liveDefinitions(data).pricing}
        source={
          <SourceLine
            from="Arch Prime Analytics"
            links={[{ label: 'Markets (API)', href: analyticsLinks(meta).markets }]}
            definition={definitions.netFlows}
          />
        }
      >
        <MarketsTable markets={lend.markets} leftOutOfTvl={data.overview.tvl_left_out.map((m) => m.symbol)} meta={meta} />
      </Panel>
      <MarketRates markets={withRates} meta={meta} />
      <Pools data={data} />
      <Vaults data={data} />
    </div>
  )
}
