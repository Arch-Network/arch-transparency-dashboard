import type { ReactNode } from 'react'
import type { Market, SnapshotMeta } from '../../data/snapshot'
import Panel from '../../components/Panel'
import SourceLine from '../../components/SourceLine'
import { definitions } from '../../lib/definitions'
import { fmtClock, fmtPrice } from '../../lib/format'
import { analyticsLinks } from '../../lib/links'

/** What the aUSD market's oracle account is a price of. Its symbol is not
 * served by either source: it was read from the account on chain. */
const USDC_FEED =
  'It reads a USDC/USD feed (the symbol on its account, read on chain on 11 November 2026), so it tracks USDC, not aUSD.'

/** What 1 aUSD is counted as on this page, beside the one observed reading there is. */
export default function Valuation({ market, meta }: { market: Market | undefined; meta: SnapshotMeta }) {
  const reading = market?.oracle_reading
  return (
    <Panel
      id="valuation"
      title="How aUSD is valued here"
      subtitle="Every USD figure for aUSD on this dashboard uses a fixed $1.00. That is an assumption, not an observed price."
      definition={definitions.ausdValuation}
      source={
        <SourceLine
          from="Arch Prime Analytics"
          links={market ? [{ label: 'Oracle price, hourly (API)', href: analyticsLinks(meta).bankOracle(market.address) }] : []}
          definition={definitions.ausdValuation}
        />
      }
    >
      <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-3">
        <Reading label="Counted on this page as" value="$1.00" detail="Fixed. An assumption: nothing here measures it." />
        <Reading
          label="Arch Lend oracle reads"
          value={reading ? fmtPrice(reading.usd) : '—'}
          detail={
            reading && market
              ? `Average over the hour from ${fmtClock(reading.as_of)}. ${USDC_FEED} The program labels the oracle’s type “${market.oracle}”` +
                (market.oracle_max_age_s !== null ? ` and accepts a price no older than ${market.oracle_max_age_s} s.` : '.') +
                ' Nothing on this page is valued at it.'
              : `No recent reading from the aUSD market’s oracle. ${USDC_FEED}`
          }
        />
        <Reading
          label="Market price"
          value="None observed"
          detail="Neither Arch Prime Analytics nor the Arch Explorer serves a traded price for aUSD."
        />
      </dl>
    </Panel>
  )
}

function Reading({ label, value, detail }: { label: string; value: string; detail: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="kpi-label">{label}</dt>
      <dd className="num mt-0.5 text-xl font-medium">{value}</dd>
      <dd className="mt-0.5 text-[13px] text-ink-2">{detail}</dd>
    </div>
  )
}
