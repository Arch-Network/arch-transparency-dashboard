import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts'
import type { PerpsSnapshot } from '../../data/perps'
import type { SnapshotMeta } from '../../data/snapshot'
import ChartBox from '../../components/ChartBox'
import Panel from '../../components/Panel'
import SourceLine from '../../components/SourceLine'
import { EmptyState } from '../../components/ui'
import { axisProps, chartMargin, gridProps, legendProps, tooltipProps } from '../../lib/chart'
import { fmtUsd } from '../../lib/format'
import { perpsLinks } from '../../lib/links'
import { perpsDefinitions } from '../../lib/perpsDefinitions'
import { colors, productColors } from '../../theme'

const MAX_BARS = 8
const OI_BAR = { stackId: 'oi', stroke: colors.card, strokeWidth: 1, isAnimationActive: false } as const

/** Side-by-side breakdown of open interest (long vs short) and top 24-hour volume by market. */
export default function OpenInterestBreakdown({ perps, meta }: { perps: PerpsSnapshot; meta: SnapshotMeta }) {
  const api = perpsLinks(meta)

  const oiRows = [...perps.markets]
    .filter((m) => m.open_interest_usd > 0)
    .sort((a, b) => b.open_interest_usd - a.open_interest_usd)
    .slice(0, MAX_BARS)
    .map((m) => ({
      symbol: m.base_symbol,
      long_usd: m.long_oi_usd,
      short_usd: m.short_oi_usd,
      total_usd: m.open_interest_usd,
    }))

  const volumeRows = [...perps.markets]
    .filter((m) => (m.volume_24h_usd ?? 0) > 0)
    .sort((a, b) => (b.volume_24h_usd ?? 0) - (a.volume_24h_usd ?? 0))
    .slice(0, MAX_BARS)
    .map((m) => ({
      symbol: m.base_symbol,
      volume_usd: m.volume_24h_usd ?? 0,
    }))

  const otherOiCount = Math.max(0, perps.markets_with_oi - oiRows.length)
  const otherVolCount = Math.max(0, perps.markets_with_volume_24h - volumeRows.length)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel
        id="perps-oi"
        title="Open interest by market"
        subtitle={
          oiRows.length > 0
            ? `Long and short taker positions at mark price${otherOiCount > 0 ? ` (top ${MAX_BARS} of ${perps.markets_with_oi})` : ''}`
            : 'No open taker positions across listed markets'
        }
        definition={perpsDefinitions.openInterest}
        source={
          <SourceLine from="Arch Perps Engine" links={api ? [{ label: 'Markets (API)', href: api.markets }] : []} />
        }
      >
        {oiRows.length === 0 ? (
          <EmptyState body="No open interest at this reading." />
        ) : (
          <ChartBox>
            <BarChart data={oiRows} margin={chartMargin}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="symbol" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v) => fmtUsd(v)} width={60} />
              <Tooltip {...tooltipProps} formatter={(v: number) => fmtUsd(v)} />
              <Legend {...legendProps} />
              <Bar dataKey="long_usd" name="Long OI" fill={colors.up} {...OI_BAR} />
              <Bar dataKey="short_usd" name="Short OI" fill={colors.down} radius={[3, 3, 0, 0]} {...OI_BAR} />
            </BarChart>
          </ChartBox>
        )}
      </Panel>

      <Panel
        id="perps-volume"
        title="Top markets by 24 h volume"
        subtitle={
          volumeRows.length > 0
            ? `Trailing 24-hour notional traded${otherVolCount > 0 ? ` (top ${MAX_BARS} of ${perps.markets_with_volume_24h} active markets)` : ''}`
            : perps.volume_24h_usd === null
              ? 'Engine has not yet completed a 24-hour fill window'
              : 'No fills recorded in the last 24 hours'
        }
        definition={perpsDefinitions.volume}
        source={
          <SourceLine from="Arch Perps Engine" links={api ? [{ label: 'Markets (API)', href: api.markets }] : []} />
        }
      >
        {volumeRows.length === 0 ? (
          <EmptyState
            body={
              perps.volume_24h_usd === null
                ? '24-hour volume is unavailable until a full day of fills is counted.'
                : 'No trading volume recorded in the last 24 hours.'
            }
          />
        ) : (
          <ChartBox>
            <BarChart data={volumeRows} margin={chartMargin}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="symbol" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v) => fmtUsd(v)} width={60} />
              <Tooltip {...tooltipProps} formatter={(v: number) => fmtUsd(v)} />
              <Bar
                dataKey="volume_usd"
                name="24 h volume"
                fill={productColors.perps}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartBox>
        )}
      </Panel>
    </div>
  )
}
