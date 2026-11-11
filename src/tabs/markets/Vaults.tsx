import type { Snapshot, Vault } from '../../data/snapshot'
import DataTable, { Stacked, type Column } from '../../components/DataTable'
import Panel from '../../components/Panel'
import SourceLine from '../../components/SourceLine'
import { definitions } from '../../lib/definitions'
import { fmtToken, fmtUsd } from '../../lib/format'
import { analyticsLinks, explorerLink } from '../../lib/links'

/** Every vault: what it records as its assets, the shares against them, and the day's flows. */
export default function Vaults({ data }: { data: Snapshot }) {
  const { vaults, meta } = data
  const columns: Column<Vault>[] = [
    {
      key: 'vault',
      header: 'Vault',
      cell: (v) => {
        const href = explorerLink(meta, 'tokens', v.share_mint)
        return (
          <Stacked
            top={v.share_symbol}
            sub={
              href && (
                <a className="link" href={href} target="_blank" rel="noreferrer">
                  Share token<span aria-hidden="true"> ↗</span>
                </a>
              )
            }
          />
        )
      },
    },
    {
      key: 'assets',
      header: 'Assets recorded',
      primary: true,
      cell: (v) => (
        <Stacked
          top={v.assets_usd === null ? '—' : fmtUsd(v.assets_usd)}
          sub={v.total_assets !== null && fmtToken(v.total_assets, v.asset_symbol)}
        />
      ),
    },
    {
      key: 'shares',
      header: 'Shares',
      cell: (v) => (v.share_supply === null ? '—' : fmtToken(v.share_supply, v.share_symbol)),
    },
    {
      key: 'nav',
      header: 'NAV per share',
      primary: true,
      cell: (v) =>
        v.nav_per_share === null ? '—' : <Stacked top={v.nav_per_share.toFixed(6)} sub={`${v.asset_symbol} per share`} />,
    },
    { key: 'deposits', header: 'Deposits, 24 h', primary: true, cell: (v) => fmtUsd(v.deposits_24h_usd) },
    { key: 'redemptions', header: 'Redemptions, 24 h', cell: (v) => fmtUsd(v.redemptions_24h_usd) },
  ]
  return (
    <Panel
      id="vaults"
      title="Vaults"
      subtitle="Each vault holds one asset and issues a share token against it. Assets are what the vault itself records."
      definition={definitions.vaultAssets}
      source={
        <SourceLine
          from="Arch Prime Analytics"
          links={[{ label: 'Vaults (API)', href: analyticsLinks(meta).vaults }]}
          definition={definitions.navPerShare}
        />
      }
    >
      <DataTable columns={columns} rows={vaults} rowKey={(v) => v.address} />
    </Panel>
  )
}
