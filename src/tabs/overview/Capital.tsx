import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import type { Snapshot, TvlComponentId, TvlDaily } from '../../data/snapshot'
import ChartBox from '../../components/ChartBox'
import { Delta } from '../../components/HeadlineMetric'
import Panel from '../../components/Panel'
import { sliceRange } from '../../components/RangeToggle'
import SourceLine from '../../components/SourceLine'
import { axisProps, chartMargin, dayAxis, gridProps, tooltipProps } from '../../lib/chart'
import { liveDefinitions } from '../../lib/definitions'
import { fmtDateShort, fmtPct, fmtUsd, usdColumn } from '../../lib/format'
import { analyticsLinks } from '../../lib/links'
import { useRange } from '../../lib/range'
import { productColors } from '../../theme'

/** The parts of TVL, in the order the chart stacks them. */
const PARTS: Record<TvlComponentId, { label: string; dataKey: keyof TvlDaily; color: string }> = {
  lend: { label: 'Arch Lend liquidity', dataKey: 'lend_usd', color: productColors.lend },
  vault: { label: 'Vault assets', dataKey: 'vault_usd', color: productColors.vaults },
  swap: { label: 'Swap pool reserves', dataKey: 'swap_usd', color: productColors.swap },
}

/** Value locked over time, stacked by product, with what each part holds now. */
export default function Capital({ data }: { data: Snapshot }) {
  const { overview, series, meta } = data
  const { range } = useRange()
  const definition = liveDefinitions(data).tvl
  const rows = sliceRange(series.tvl_daily, range)
  const today = series.tvl_daily[series.tvl_daily.length - 1]?.date
  const partUsd = usdColumn(overview.tvl_components.map((c) => c.usd))

  return (
    <Panel
      id="tvl"
      title="Value locked over time"
      subtitle={
        overview.tvl_method === 'protocol'
          ? 'Stacked by product. Each day is its closing balance; the last point is now.'
          : 'Stacked by product, one point a day; the last point is now'
      }
      definition={definition}
      source={
        <SourceLine
          from="Arch Prime Analytics"
          links={[{ label: 'Daily TVL (API)', href: analyticsLinks(meta).protocolDaily('tvl') }]}
          definition={definition}
          csv={{
            filename: 'arch-prime-tvl-daily.csv',
            rows: () =>
              series.tvl_daily.map((r) => ({
                date: r.date,
                lend_usd: r.lend_usd,
                vault_usd: r.vault_usd,
                swap_usd: r.swap_usd,
                total_usd: r.lend_usd + r.vault_usd + r.swap_usd,
              })),
          }}
        />
      }
    >
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <ChartBox size="tall">
          <AreaChart data={rows} margin={chartMargin}>
            <CartesianGrid {...gridProps} />
            <XAxis {...dayAxis(rows, 'Now')} />
            <YAxis {...axisProps} tickFormatter={(v) => fmtUsd(v)} width={56} />
            <Tooltip
              {...tooltipProps}
              formatter={(v: number) => fmtUsd(v)}
              labelFormatter={(d: string) => (d === today ? `${fmtDateShort(d)} · now` : fmtDateShort(d))}
            />
            {overview.tvl_components.map(({ id }) => (
              <Area
                key={id}
                dataKey={PARTS[id].dataKey}
                name={PARTS[id].label}
                stackId="tvl"
                stroke={PARTS[id].color}
                fill={PARTS[id].color}
                fillOpacity={0.85}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ChartBox>

        <ul className="divide-y divide-line self-center text-[13px]">
          {overview.tvl_components.map((c) => (
            <li key={c.id} className="py-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="size-2 shrink-0 rounded-[2px]" style={{ background: PARTS[c.id].color }} />
                  {PARTS[c.id].label}
                </span>
                <span className="num text-[15px] font-medium">{partUsd(c.usd)}</span>
              </div>
              <div className="num mt-0.5 pl-4 text-xs text-ink-2">
                {overview.tvl_usd > 0 && `${fmtPct((c.usd / overview.tvl_usd) * 100)} of TVL`}
                {c.change_24h_pct !== null && (
                  <>
                    {' · '}
                    <Delta pct={c.change_24h_pct} /> in 24 hours
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  )
}
