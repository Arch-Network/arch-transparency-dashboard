import { useMemo, useState } from 'react'
import type { PerpsMarket, PerpsSnapshot } from '../../data/perps'
import type { SnapshotMeta } from '../../data/snapshot'
import DataTable, { Stacked, type Column } from '../../components/DataTable'
import { Delta } from '../../components/HeadlineMetric'
import Panel from '../../components/Panel'
import Segmented from '../../components/Segmented'
import SourceLine from '../../components/SourceLine'
import { fmtNum, fmtPct, fmtPrice, fmtUsd, usdColumn } from '../../lib/format'
import { perpsLinks } from '../../lib/links'
import { perpsDefinitions } from '../../lib/perpsDefinitions'

type Filter = 'active' | 'all' | 'crypto' | 'tradfi'
type SortKey = 'volume' | 'oi' | 'funding' | 'change'

const UNDERLYING_LABEL: Record<string, string> = {
  coin: 'Crypto',
  stock: 'TradFi · Stock',
  fund: 'TradFi · ETF/Fund',
  commodity: 'TradFi · Commodity',
  currency: 'TradFi · FX',
}

function fmtSignedRate(n: number, digits: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '−' : ''
  return `${sign}${Math.abs(n).toFixed(digits)}%`
}

function rateTone(n: number): string {
  if (Math.abs(n) < 1e-6) return 'text-ink-2'
  return n > 0 ? 'text-up' : 'text-down'
}

/** Searchable, filterable table of every perpetual market on Arch Perps. */
export default function MarketsTable({ perps, meta }: { perps: PerpsSnapshot; meta: SnapshotMeta }) {
  const hasActive = perps.markets_with_oi > 0 || perps.markets_with_volume_24h > 0
  const [filter, setFilter] = useState<Filter>(hasActive ? 'active' : 'all')
  const [sort, setSort] = useState<SortKey>('volume')
  const [query, setQuery] = useState('')

  const activeCount = useMemo(
    () => perps.markets.filter((m) => m.open_interest_usd > 0 || (m.volume_24h_usd ?? 0) > 0).length,
    [perps.markets],
  )

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = perps.markets.filter((m) => {
      if (q && !m.symbol.toLowerCase().includes(q) && !m.base_symbol.toLowerCase().includes(q)) return false
      if (q) return true // Searching searches across all markets regardless of tab filter.
      if (filter === 'active') return m.open_interest_usd > 0 || (m.volume_24h_usd ?? 0) > 0
      if (filter === 'crypto') return m.market_class === 'crypto'
      if (filter === 'tradfi') return m.market_class === 'tradfi'
      return true
    })
    return [...filtered].sort((a, b) => {
      if (sort === 'oi') {
        if (b.open_interest_usd !== a.open_interest_usd) return b.open_interest_usd - a.open_interest_usd
        return (b.volume_24h_usd ?? -1) - (a.volume_24h_usd ?? -1)
      }
      if (sort === 'funding') {
        return Math.abs(b.funding_rate_apr_pct) - Math.abs(a.funding_rate_apr_pct)
      }
      if (sort === 'change') {
        const ac = a.change_24h_pct ?? -Infinity
        const bc = b.change_24h_pct ?? -Infinity
        return Math.abs(bc) - Math.abs(ac)
      }
      const volDiff = (b.volume_24h_usd ?? -1) - (a.volume_24h_usd ?? -1)
      if (volDiff !== 0) return volDiff
      return b.open_interest_usd - a.open_interest_usd
    })
  }, [perps.markets, filter, sort, query])

  const volFmt = usdColumn(rows.map((r) => r.volume_24h_usd))
  const oiFmt = usdColumn(rows.map((r) => r.open_interest_usd))
  const api = perpsLinks(meta)

  const columns: Column<PerpsMarket>[] = [
    {
      key: 'symbol',
      header: 'Market',
      cell: (m) => {
        const tag = m.underlying ? UNDERLYING_LABEL[m.underlying] : m.market_class ?? 'Other'
        return (
          <Stacked
            top={
              <span className="inline-flex items-center gap-1.5">
                {m.symbol}
                {m.split && (
                  <span className="chip">{m.split.closed ? 'Split halt' : 'Split'}</span>
                )}
              </span>
            }
            sub={tag}
          />
        )
      },
    },
    {
      key: 'price',
      header: 'Mark / 24 h',
      primary: true,
      cell: (m) => (
        <Stacked
          top={<span className="num">{m.mark_price_usd > 0 ? fmtPrice(m.mark_price_usd) : '—'}</span>}
          sub={
            m.change_24h_pct !== null ? (
              <Delta pct={m.change_24h_pct} digits={2} />
            ) : (
              '—'
            )
          }
        />
      ),
    },
    {
      key: 'volume',
      header: 'Volume, 24 h',
      primary: true,
      cell: (m) => (
        <span className="num">{m.volume_24h_usd !== null ? volFmt(m.volume_24h_usd) : '—'}</span>
      ),
    },
    {
      key: 'oi',
      header: 'Open interest',
      primary: true,
      cell: (m) => (
        <Stacked
          top={<span className="num">{oiFmt(m.open_interest_usd)}</span>}
          sub={
            m.open_interest_usd > 0
              ? `L ${fmtUsd(m.long_oi_usd)} · S ${fmtUsd(m.short_oi_usd)}`
              : 'No open positions'
          }
        />
      ),
    },
    {
      key: 'funding',
      header: 'Funding (APR / 1 h)',
      cell: (m) => (
        <Stacked
          top={
            <span className={`num ${rateTone(m.funding_rate_apr_pct)}`}>
              {fmtSignedRate(m.funding_rate_apr_pct, 2)}
            </span>
          }
          sub={<span className="num">{fmtSignedRate(m.funding_rate_hr_pct, 4)} / hr</span>}
        />
      ),
    },
    {
      key: 'spread',
      header: 'Spread / Depth',
      cell: (m) => (
        <Stacked
          top={
            <span className="num">
              {m.spread_bps !== null ? `${m.spread_bps.toFixed(1)} bps` : 'Unquoted'}
            </span>
          }
          sub={
            m.quoted_depth_usd !== null ? `Up to ${fmtUsd(m.quoted_depth_usd)} / side` : 'No active quote'
          }
        />
      ),
    },
    {
      key: 'leverage',
      header: 'Max lev / Margin',
      cell: (m) => (
        <Stacked
          top={<span className="num">{m.max_leverage > 0 ? `${m.max_leverage}×` : '—'}</span>}
          sub={`${fmtPct(m.initial_margin_pct, 1)} init / ${fmtPct(m.maintenance_margin_pct, 1)} maint`}
        />
      ),
    },
  ]

  return (
    <Panel
      id="perps-markets"
      title="Perpetual markets"
      subtitle={
        query.trim()
          ? `Showing ${fmtNum(rows.length)} of ${fmtNum(perps.markets_total)} markets matching “${query.trim()}”`
          : `Showing ${fmtNum(rows.length)} of ${fmtNum(perps.markets_total)} markets (${fmtNum(perps.crypto_markets)} crypto · ${fmtNum(perps.tradfi_markets)} TradFi)`
      }
      definition={perpsDefinitions.spreadAndLeverage}
      actions={
        <>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter symbol…"
            aria-label="Filter perpetual markets by symbol"
            className="rounded-control border border-line-2 bg-card px-2.5 py-1 text-xs text-ink placeholder:text-ink-2 focus:border-ink focus:outline-none"
          />
          <Segmented
            label="Market filter"
            options={[
              { id: 'active', label: `Active (${activeCount})` },
              { id: 'all', label: `All (${perps.markets_total})` },
              { id: 'crypto', label: `Crypto (${perps.crypto_markets})` },
              { id: 'tradfi', label: `TradFi (${perps.tradfi_markets})` },
            ]}
            value={filter}
            onChange={setFilter}
          />
          <Segmented
            label="Sort markets"
            options={[
              { id: 'volume', label: 'Vol 24 h' },
              { id: 'oi', label: 'OI' },
              { id: 'funding', label: 'Funding' },
              { id: 'change', label: '24 h %' },
            ]}
            value={sort}
            onChange={setSort}
          />
        </>
      }
      source={
        <SourceLine
          from="Arch Perps Engine"
          links={api ? [{ label: 'Markets (API)', href: api.markets }] : []}
          csv={{
            filename: 'arch-perps-markets.csv',
            rows: () =>
              perps.markets.map((m) => ({
                symbol: m.symbol,
                class: m.market_class ?? '',
                underlying: m.underlying ?? '',
                mark_price_usd: m.mark_price_usd,
                index_price_usd: m.index_price_usd,
                change_24h_pct: m.change_24h_pct ?? '',
                volume_24h_usd: m.volume_24h_usd ?? '',
                open_interest_usd: m.open_interest_usd,
                long_oi_usd: m.long_oi_usd,
                short_oi_usd: m.short_oi_usd,
                funding_rate_hr_pct: m.funding_rate_hr_pct,
                funding_rate_apr_pct: m.funding_rate_apr_pct,
                spread_bps: m.spread_bps ?? '',
                max_leverage: m.max_leverage,
                initial_margin_pct: m.initial_margin_pct,
                maintenance_margin_pct: m.maintenance_margin_pct,
                taker_fee_bps: m.taker_fee_bps,
              })),
          }}
        />
      }
    >
      {rows.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-ink-2">No perpetual markets match the current filter.</p>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(m) => String(m.id)} tableFrom="lg" />
      )}
    </Panel>
  )
}
