import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Snapshot } from '../../data/snapshot'
import Panel from '../../components/Panel'
import SourceLine from '../../components/SourceLine'
import { EmptyState, ProgressBar } from '../../components/ui'
import { axisProps, legendProps, tooltipProps } from '../../lib/chart'
import { definitions } from '../../lib/definitions'
import { fmtUsd } from '../../lib/format'
import { analyticsLinks } from '../../lib/links'
import { usePageHref } from '../../lib/range'
import { colors, productColors } from '../../theme'

const MAX_ASSETS = 8

/**
 * Row 3 of Overview's 2-column grid (9031wyb82's iconic bottom visual row):
 * Left: Supplied & Borrowed by Asset (horizontal bar chart)
 * Right: Available Liquidity (clean horizontal bar meters across Lend, Swap, and Perps vault)
 */
export default function MarketBreakdown({ data }: { data: Snapshot }) {
  const { lend, pools, perps, meta } = data
  const api = analyticsLinks(meta)
  const href = usePageHref()

  const fundedMarkets = [...lend.markets]
    .filter((m) => m.supplied_usd !== null && m.supplied_usd > 0)
    .sort((a, b) => (b.supplied_usd ?? 0) - (a.supplied_usd ?? 0))

  const assetRows = fundedMarkets.slice(0, MAX_ASSETS).map((m) => ({
    symbol: m.symbol,
    supplied_usd: m.supplied_usd ?? 0,
    borrowed_usd: m.borrowed_usd ?? 0,
  }))

  const liquidityRows: { label: string; value: number; tag?: string; color?: string }[] = [
    ...fundedMarkets
      .filter((m) => (m.available_usd ?? 0) >= 1)
      .slice(0, 6)
      .map((m) => ({ label: `${m.symbol} in Lend`, value: m.available_usd ?? 0 })),
    ...pools
      .filter((p) => p.tvl_usd >= 1)
      .slice(0, 4)
      .map((p) => ({ label: `${p.pair} pool`, value: p.tvl_usd })),
    ...(perps?.on_chain && perps.on_chain.total_balance_usd > 0
      ? [
          {
            label: 'Arch Perps Vault',
            value: perps.on_chain.total_balance_usd,
            tag: 'separate from TVL',
            color: productColors.perps,
          },
        ]
      : []),
  ]
  const liqMax = Math.max(...liquidityRows.map((r) => r.value), 1)
  const barChartHeight = Math.max(220, assetRows.length * 42)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel
        id="assets-breakdown"
        title="Supplied & Borrowed by Asset"
        subtitle="Funded Arch Lend markets, largest first."
        actions={
          <a className="btn" href={href('markets', 'lend')}>
            All markets
          </a>
        }
        source={<SourceLine from="Arch Prime Analytics" links={[{ label: 'Markets (API)', href: api.markets }]} />}
      >
        {assetRows.length === 0 ? (
          <EmptyState body="No funded Arch Lend markets with a reference price." />
        ) : (
          <div style={{ height: barChartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={assetRows} margin={{ top: 4, right: 16, left: 4, bottom: 0 }} barGap={2}>
                <CartesianGrid stroke={colors.chartGrid} horizontal={false} />
                <XAxis type="number" {...axisProps} tickFormatter={(v) => fmtUsd(v)} />
                <YAxis
                  type="category"
                  dataKey="symbol"
                  tick={{ fontSize: 11.5, fill: colors.ink, fontFamily: 'var(--ap-font-num)', fontWeight: 500 }}
                  width={76}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip {...tooltipProps} formatter={(v: number) => fmtUsd(v)} />
                <Legend {...legendProps} />
                <Bar dataKey="supplied_usd" name="Supplied" fill={productColors.lend} radius={[0, 3, 3, 0]} isAnimationActive={false} />
                <Bar dataKey="borrowed_usd" name="Borrowed" fill={productColors.vaults} radius={[0, 3, 3, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <Panel
        id="available-liquidity"
        title="Available Liquidity"
        subtitle="Unborrowed Arch Lend deposits, Swap pool reserves, and on-chain Perps vault collateral."
        definition={definitions.availableLiquidity}
        source={
          <SourceLine
            from="Arch Prime Analytics"
            links={[
              { label: 'Markets (API)', href: api.markets },
              { label: 'Pools (API)', href: api.pools },
            ]}
          />
        }
      >
        {liquidityRows.length === 0 ? (
          <EmptyState body="No liquidity readings available." />
        ) : (
          <div className="space-y-3.5 pt-1">
            {liquidityRows.map((r) => (
              <div key={r.label}>
                <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                  <span className="truncate text-ink-2">
                    {r.label}
                    {r.tag && <span className="ml-1.5 text-[11px] text-ink-3">({r.tag})</span>}
                  </span>
                  <span className="num shrink-0 text-[13.5px] font-semibold text-ink">{fmtUsd(r.value)}</span>
                </div>
                <ProgressBar
                  pct={(r.value / liqMax) * 100}
                  color={r.color ?? 'var(--ap-brand)'}
                  height="h-2"
                  className="mt-1.5"
                />
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
