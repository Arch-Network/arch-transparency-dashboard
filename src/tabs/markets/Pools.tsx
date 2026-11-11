import type { Pool, Snapshot } from '../../data/snapshot'
import DataTable, { type Column } from '../../components/DataTable'
import Panel from '../../components/Panel'
import SourceLine from '../../components/SourceLine'
import { definitions } from '../../lib/definitions'
import { fmtNum, fmtPct, fmtUsd } from '../../lib/format'
import { analyticsLinks, explorerLink } from '../../lib/links'

/** Every Arch Swap pool, and the PropAMM market maker's fills beside them. */
export default function Pools({ data }: { data: Snapshot }) {
  const { pools, overview, meta } = data
  const columns: Column<Pool>[] = [
    {
      key: 'pool',
      header: 'Pool',
      cell: (p) => {
        const href = explorerLink(meta, 'accounts', p.address)
        return href ? (
          <a className="link" href={href} target="_blank" rel="noreferrer">
            {p.pair}
          </a>
        ) : (
          p.pair
        )
      },
    },
    { key: 'reserves', header: 'Reserves', primary: true, cell: (p) => fmtUsd(p.tvl_usd) },
    { key: 'volume_24h', header: 'Volume, 24 h', primary: true, cell: (p) => fmtUsd(p.volume_24h_usd) },
    { key: 'volume_7d', header: 'Volume, 7 d', cell: (p) => fmtUsd(p.volume_7d_usd) },
    { key: 'volume_30d', header: 'Volume, 30 d', cell: (p) => fmtUsd(p.volume_30d_usd) },
    { key: 'swaps', header: 'Swaps, 24 h', cell: (p) => fmtNum(p.swaps_24h) },
    { key: 'fees', header: 'Fees, 24 h', primary: true, cell: (p) => fmtUsd(p.fees_24h_usd) },
    { key: 'fee_apr', header: 'Fee APR', cell: (p) => (p.fee_apr_pct === null ? '—' : fmtPct(p.fee_apr_pct)) },
  ]
  return (
    <Panel
      id="pools"
      title="Arch Swap pools"
      subtitle="Reserves, trading and gross fees, pool by pool."
      definition={definitions.feeApr}
      source={<SourceLine from="Arch Prime Analytics" links={[{ label: 'Pools (API)', href: analyticsLinks(meta).pools }]} />}
    >
      <DataTable columns={columns} rows={pools} rowKey={(p) => p.address} />
      {overview.propamm_volume_24h_usd !== null && overview.propamm_volume_cum_usd !== null && (
        <p className="mt-3 max-w-3xl text-xs text-ink-2">
          The PropAMM market maker is not a pool: it filled {fmtUsd(overview.propamm_volume_24h_usd)} in the last 24
          hours and {fmtUsd(overview.propamm_volume_cum_usd)} to date. Its inventory is the maker’s own, not user
          deposits, so it is not counted in TVL, and its fills add nothing to pool fees.
        </p>
      )}
    </Panel>
  )
}
