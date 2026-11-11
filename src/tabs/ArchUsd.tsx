import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { Market, Snapshot } from '../data/snapshot'
import { palette } from '../theme'
import { fmtUsd, fmtNum, fmtPct, fmtToken, fmtDateShort } from '../lib/format'
import { definitions } from '../lib/definitions'
import { tooltipProps, axisTick, gridProps, legendProps, lineProps } from '../lib/chart'
import KpiCard from '../components/KpiCard'
import ChartPanel from '../components/ChartPanel'

interface Props {
  data: Snapshot
  onMethodology: () => void
}

export default function ArchUsd({ data, onMethodology }: Props) {
  const { tokens, lend } = data
  const market = tokens && lend.markets.find((m) => m.mint === tokens.ausd_mint)

  return (
    <div className="space-y-3">
      <div className="pb-1">
        <h2 className="text-[26px] font-medium leading-tight">ArchUSD</h2>
        <p className="mt-1 text-[13px] text-ink-2">
          aUSD on Arch: how much exists, who holds it, and how it is used in Arch Lend.
        </p>
      </div>

      {!tokens ? (
        <div className="card px-4 py-8 text-center text-[13px] text-ink-2">
          aUSD figures come from the Arch Explorer, which did not answer. They return with the next refresh.
        </div>
      ) : (
        <>
          <div className="card grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
            <KpiCard
              label="aUSD Supply"
              value={fmtToken(tokens.ausd_supply, 'aUSD')}
              tooltip={definitions.ausdSupply}
              onMethodology={onMethodology}
              sub={<span>in existence on Arch</span>}
            />
            <KpiCard
              label="Holders"
              value={fmtNum(tokens.ausd_holders)}
              sub={<span>token accounts with a balance</span>}
              onMethodology={onMethodology}
            />
            <KpiCard
              label="Transfers Recorded"
              value={fmtNum(tokens.ausd_transfers_total)}
              tooltip={definitions.ausdTransfers}
              sub={<span>{fmtToken(tokens.ausd_transfer_volume_total, 'aUSD')} moved, all-time, per the Arch Explorer</span>}
              onMethodology={onMethodology}
            />
            <KpiCard
              label="Supplied to Arch Lend"
              value={market?.supplied_usd != null ? fmtUsd(market.supplied_usd) : '—'}
              sub={
                market?.borrowed_usd != null ? <span>{fmtUsd(market.borrowed_usd)} of it borrowed</span> : undefined
              }
              onMethodology={onMethodology}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <ChartPanel
                title="Transfer Activity"
                subtitle="aUSD moved each UTC day over the last 30 days, and the number of transfers, as recorded by the Arch Explorer, which misses some transfers inside multi-step transactions."
                tooltip={definitions.ausdTransfers}
                onMethodology={onMethodology}
              >
                {() => (
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart
                      data={tokens.ausd_transfers_daily}
                      margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={axisTick} minTickGap={16} />
                      <YAxis yAxisId="v" tickFormatter={(v) => fmtNum(v)} tick={axisTick} width={54} />
                      <YAxis yAxisId="n" orientation="right" tickFormatter={(v) => fmtNum(v)} tick={axisTick} width={40} />
                      <Tooltip
                        {...tooltipProps}
                        labelFormatter={fmtDateShort}
                        formatter={(v: number, name: string) =>
                          name === 'Transfers' ? v.toLocaleString('en-US') : fmtToken(v, 'aUSD')
                        }
                      />
                      <Legend {...legendProps} />
                      <Bar yAxisId="v" dataKey="volume" name="Volume" fill={palette[0]} isAnimationActive={false} />
                      <Line yAxisId="n" dataKey="transfers" name="Transfers" stroke={palette[1]} {...lineProps} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>
            </div>

            {market && <LendCard market={market} />}
          </div>
        </>
      )}
    </div>
  )
}

function LendCard({ market }: { market: Market }) {
  const rows: [string, string][] = [
    ['Supplied', market.supplied_usd != null ? fmtUsd(market.supplied_usd) : '—'],
    ['Borrowed', market.borrowed_usd != null ? fmtUsd(market.borrowed_usd) : '—'],
    ['Available to borrow', market.available_usd != null ? fmtUsd(market.available_usd) : '—'],
    ['Utilization', fmtPct(market.utilization_pct)],
    ['Supply APR', fmtPct(market.supply_apr_pct, 2)],
    ['Borrow APR', fmtPct(market.borrow_apr_pct, 2)],
  ]
  return (
    <section className="card min-w-0 p-4">
      <h3 className="text-[15px] font-medium">aUSD in Arch Lend</h3>
      <p className="mt-0.5 text-[13px] text-ink-2">The aUSD market, now.</p>
      <dl className="mt-3 divide-y divide-line text-[13px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-4 py-2">
            <dt className="text-ink-2">{k}</dt>
            <dd className="num text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
