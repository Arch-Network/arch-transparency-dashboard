import type { Market, MarketPrice, SnapshotMeta } from '../data/snapshot'
import { fmtClock, fmtPct, fmtPrice, fmtToken, fmtUsd, fmtUsdChange } from '../lib/format'
import { explorerLink } from '../lib/links'
import DataTable, { Stacked, type Column } from './DataTable'

interface Props {
  markets: Market[]
  /** Symbols of the markets whose deposits are not counted in TVL. */
  leftOutOfTvl: string[]
  meta: SnapshotMeta
}

const sourceLabels: Record<MarketPrice['source'], string> = {
  fixed: 'Fixed',
  coinbase: 'Coinbase',
  vault: 'Vault NAV per share',
  pool: 'Arch Swap pool',
  reference: 'Reference feed',
  oracle: 'Arch Lend oracle',
}

/** A balance in USD with the token amount beneath; a dash where there is no price. */
const amount = (usd: number | null, units: number, symbol: string) => (
  <Stacked top={usd !== null ? fmtUsd(usd) : '—'} sub={fmtToken(units, symbol)} />
)

/** Every Arch Lend market: the price it is valued at, balances, utilization, current rates and the day's net deposits. */
export default function MarketsTable({ markets, leftOutOfTvl, meta }: Props) {
  const shares = markets.filter((m) => m.vault_shares)
  const byOracle = markets.filter((m) => m.price?.source === 'oracle')
  const symbols = (list: Market[]) => list.map((m) => m.symbol).join(', ')

  const columns: Column<Market>[] = [
    { key: 'market', header: 'Market', cell: (m) => <MarketName market={m} meta={meta} /> },
    {
      key: 'price',
      header: 'Price',
      cell: ({ price }) =>
        price ? (
          <Stacked
            top={fmtPrice(price.usd)}
            sub={sourceLabels[price.source] + (price.as_of ? ` · hour from ${fmtClock(price.as_of)}` : '')}
          />
        ) : (
          '—'
        ),
    },
    { key: 'supplied', header: 'Supplied', primary: true, cell: (m) => amount(m.supplied_usd, m.supplied, m.symbol) },
    { key: 'borrowed', header: 'Borrowed', primary: true, cell: (m) => amount(m.borrowed_usd, m.borrowed, m.symbol) },
    {
      key: 'available',
      header: 'Available',
      cell: (m) => amount(m.available_usd, m.supplied - m.borrowed, m.symbol),
    },
    { key: 'utilization', header: 'Utilization', primary: true, cell: (m) => fmtPct(m.utilization_pct) },
    { key: 'supply_apr', header: 'Supply APR', cell: (m) => fmtPct(m.supply_apr_pct, 2) },
    { key: 'borrow_apr', header: 'Borrow APR', cell: (m) => fmtPct(m.borrow_apr_pct, 2) },
    {
      key: 'net_deposits',
      header: 'Net deposits, 24 h',
      cell: (m) => (m.net_deposits_24h_usd === null ? '—' : fmtUsdChange(m.net_deposits_24h_usd)),
    },
  ]

  return (
    <div>
      <DataTable columns={columns} rows={markets} rowKey={(m) => m.address} tableFrom="lg" />
      {(shares.length > 0 || byOracle.length > 0) && (
        <p className="mt-3 max-w-3xl text-xs text-ink-2">
          {shares.length > 0 &&
            `Vault shares supplied as collateral: ${symbols(shares)}. Their value counts toward TVL once, in the vault’s assets. `}
          {byOracle.length > 0 &&
            `Valued at the Arch Lend oracle price, averaged over the current hour: ${symbols(byOracle)}. `}
          {leftOutOfTvl.length > 0 && `Not counted in TVL, having no reference price: ${leftOutOfTvl.join(', ')}.`}
        </p>
      )}
    </div>
  )
}

/** The market's symbol, with its accounts on the Arch Explorer where they can be linked. */
function MarketName({ market, meta }: { market: Market; meta: SnapshotMeta }) {
  const bank = explorerLink(meta, 'accounts', market.address)
  const liquidity = market.liquidity_account && explorerLink(meta, 'accounts', market.liquidity_account)
  return (
    <Stacked
      top={market.symbol}
      sub={
        bank && (
          <>
            <a className="link" href={bank} target="_blank" rel="noreferrer">
              Market
            </a>
            {liquidity && (
              <>
                {' · '}
                <a className="link" href={liquidity} target="_blank" rel="noreferrer">
                  Liquidity
                </a>
              </>
            )}
            <span className="sr-only"> accounts on the Arch Explorer</span>
            <span aria-hidden="true"> ↗</span>
          </>
        )
      }
    />
  )
}
