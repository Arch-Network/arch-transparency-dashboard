import type { Market, MarketPrice } from '../data/snapshot'
import { fmtUsd, fmtPct, fmtToken } from '../lib/format'

interface Props {
  markets: Market[]
  /** Symbols of the markets whose deposits are not counted in TVL. */
  leftOutOfTvl: string[]
}

const sourceLabels: Record<MarketPrice['source'], string> = {
  fixed: 'Fixed',
  coinbase: 'Coinbase',
  vault: 'Vault NAV per share',
  pool: 'Arch Swap pool',
  reference: 'Reference feed',
  oracle: 'Arch Lend oracle',
}

/** Every Arch Lend market: the price it is valued at, balances, utilization and current rates. */
export default function MarketsTable({ markets, leftOutOfTvl }: Props) {
  const shares = markets.filter((m) => m.vault_shares)
  const byOracle = markets.filter((m) => m.price?.source === 'oracle')
  const symbols = (list: Market[]) => list.map((m) => m.symbol).join(', ')
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line text-xs text-ink-2">
              <th className="px-2 py-2 font-medium">Market</th>
              <th className="px-2 py-2 text-right font-medium">Price</th>
              <th className="px-2 py-2 text-right font-medium">Supplied</th>
              <th className="px-2 py-2 text-right font-medium">Borrowed</th>
              <th className="px-2 py-2 text-right font-medium">Available</th>
              <th className="px-2 py-2 text-right font-medium">Utilization</th>
              <th className="px-2 py-2 text-right font-medium">Supply APR</th>
              <th className="px-2 py-2 text-right font-medium">Borrow APR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {markets.map((m) => (
              <tr key={m.address} className="align-top">
                <td className="px-2 py-2 font-medium">{m.symbol}</td>
                <Price price={m.price} />
                <Amount usd={m.supplied_usd} units={m.supplied} symbol={m.symbol} />
                <Amount usd={m.borrowed_usd} units={m.borrowed} symbol={m.symbol} />
                <Amount usd={m.available_usd} units={m.supplied - m.borrowed} symbol={m.symbol} />
                <td className="px-2 py-2 text-right">{fmtPct(m.utilization_pct)}</td>
                <td className="px-2 py-2 text-right">{fmtPct(m.supply_apr_pct, 2)}</td>
                <td className="px-2 py-2 text-right">{fmtPct(m.borrow_apr_pct, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(shares.length > 0 || byOracle.length > 0) && (
        <p className="mt-3 max-w-3xl px-2 text-xs text-ink-2">
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

/** The price a market is valued at, with its source and the hour it belongs to beneath. */
function Price({ price }: { price: MarketPrice | null }) {
  if (!price) return <td className="px-2 py-2 text-right">—</td>
  return (
    <td className="px-2 py-2 text-right">
      {fmtPrice(price.usd)}
      <div className="text-xs text-ink-2">
        {sourceLabels[price.source]}
        {price.as_of && ` · hour from ${price.as_of.slice(11, 16)} UTC`}
      </div>
    </td>
  )
}

/** Enough digits to tell a share price from $1, without cents on a five-figure price. */
function fmtPrice(usd: number): string {
  const digits = usd >= 1000 ? 0 : usd >= 10 ? 2 : 4
  return '$' + usd.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** A balance in USD with the token amount beneath; a dash where there is no price. */
function Amount({ usd, units, symbol }: { usd: number | null; units: number; symbol: string }) {
  return (
    <td className="px-2 py-2 text-right">
      {usd !== null ? fmtUsd(usd) : '—'}
      <div className="text-xs text-ink-2">{fmtToken(units, symbol)}</div>
    </td>
  )
}
