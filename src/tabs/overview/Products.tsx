import type { Snapshot, TvlComponentId } from '../../data/snapshot'
import DataTable, { Stacked, type Column } from '../../components/DataTable'
import Panel from '../../components/Panel'
import SourceLine from '../../components/SourceLine'
import { definitions } from '../../lib/definitions'
import { fmtNum, fmtUsd, fmtUsdChange } from '../../lib/format'
import { analyticsLinks } from '../../lib/links'
import { usePageHref } from '../../lib/range'

interface ProductRow {
  name: string
  /** Its section on the Markets page. */
  anchor: string
  /** What it adds to TVL; null for a product TVL does not count. */
  lockedUsd: number | null
  lockedNote: string
  activity: string
  activityNote: string
  earned: string
  earnedNote: string
}

function productRows({ overview, lend, vaults }: Snapshot): ProductRow[] {
  const locked = (id: TvlComponentId) => overview.tvl_components.find((c) => c.id === id)?.usd ?? 0
  const vaultNet = vaults.reduce((total, v) => total + v.deposits_24h_usd - v.redemptions_24h_usd, 0)
  const credited = overview.lender_interest_method === 'credited'
  return [
    {
      name: 'Arch Lend',
      anchor: 'lend',
      lockedUsd: locked('lend'),
      lockedNote: 'supplied and not borrowed',
      activity: fmtUsdChange(lend.net_deposits_24h_usd),
      activityNote: `net deposits · ${fmtUsdChange(lend.net_borrowed_24h_usd)} net borrowed`,
      earned: fmtUsd(overview.lender_interest_7d_usd),
      earnedNote: credited ? 'interest credited to lenders, 7 d' : 'interest to lenders, 7 d, estimated',
    },
    {
      name: 'Vaults',
      anchor: 'vaults',
      lockedUsd: locked('vault'),
      lockedNote: 'assets the vaults record',
      activity: fmtUsdChange(vaultNet),
      activityNote: 'net deposits',
      earned: '—',
      earnedNote: 'no earnings figure is served',
    },
    {
      name: 'Arch Swap pools',
      anchor: 'pools',
      lockedUsd: locked('swap'),
      lockedNote: 'pool reserves',
      activity: fmtUsd(overview.pool_volume_24h_usd),
      activityNote: `volume · ${fmtNum(overview.pool_swaps_24h)} swaps`,
      earned: fmtUsd(overview.swap_fees_24h_usd),
      earnedNote: 'swap fees, 24 h, before the split',
    },
    ...(overview.propamm_volume_24h_usd !== null
      ? [
          {
            name: 'PropAMM market maker',
            anchor: 'pools',
            lockedUsd: null,
            lockedNote: 'the maker’s own inventory, not deposits',
            activity: fmtUsd(overview.propamm_volume_24h_usd),
            activityNote: 'filled',
            earned: '—',
            earnedNote: 'fills add no pool fee',
          },
        ]
      : []),
  ]
}

/** One row per product: what it holds, what moved in the last 24 hours, what it earned. */
export default function Products({ data }: { data: Snapshot }) {
  const href = usePageHref()
  const api = analyticsLinks(data.meta)
  const columns: Column<ProductRow>[] = [
    {
      key: 'name',
      header: 'Product',
      cell: (r) => (
        <a className="link" href={href('markets', r.anchor)}>
          {r.name}
        </a>
      ),
    },
    {
      key: 'locked',
      header: 'Counted in TVL',
      primary: true,
      cell: (r) => <Stacked top={r.lockedUsd === null ? 'Not counted' : fmtUsd(r.lockedUsd)} sub={r.lockedNote} />,
    },
    {
      key: 'activity',
      header: 'Last 24 h',
      primary: true,
      cell: (r) => <Stacked top={r.activity} sub={r.activityNote} />,
    },
    {
      key: 'earned',
      header: 'Earned',
      primary: true,
      cell: (r) => <Stacked top={r.earned} sub={r.earnedNote} />,
    },
  ]
  return (
    <Panel
      id="products"
      title="Products"
      subtitle="What each product holds, what moved through it in the last 24 hours, and what it earned"
      definition={definitions.netFlows}
      source={
        <SourceLine
          from="Arch Prime Analytics"
          links={[
            { label: 'Markets (API)', href: api.markets },
            { label: 'Vaults (API)', href: api.vaults },
            { label: 'Pools (API)', href: api.pools },
          ]}
        />
      }
    >
      <DataTable columns={columns} rows={productRows(data)} rowKey={(r) => r.name} />
    </Panel>
  )
}
