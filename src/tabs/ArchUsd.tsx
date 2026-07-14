import {
  ComposedChart,
  AreaChart,
  Area,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import type { MockData } from '../types'
import { colors } from '../theme'
import { fmtUsd, fmtPct, fmtDateShort, fmtTs, fmtDelta } from '../lib/format'
import { tooltips } from '../lib/tooltips'
import { tooltipStyle, axisTick, legendStyle } from '../lib/chart'
import KpiCard, { Delta } from '../components/KpiCard'
import ChartPanel from '../components/ChartPanel'
import { sliceRange } from '../components/RangeToggle'
import DemoDataFootnote from '../components/DemoDataFootnote'

interface Props {
  data: MockData
  onMethodology: () => void
}

const COMPOSITION_COLORS = [colors.navy, colors.orange, colors.gold, colors.slate]

export default function ArchUsd({ data, onMethodology }: Props) {
  const a = data.archusd
  const flows = a.flows_daily
  const supplyPrev = a.nav_daily[a.nav_daily.length - 2].supply_onchain_usd
  const supply7d = a.nav_daily[a.nav_daily.length - 8].supply_onchain_usd
  const change24h = ((a.supply_onchain_usd - supplyPrev) / supplyPrev) * 100
  const change7d = ((a.supply_onchain_usd - supply7d) / supply7d) * 100
  const priorYield = a.yield_daily[Math.max(a.yield_daily.length - 31, 0)].basis_apr_30d_pct
  const yieldDeltaPts = a.basis_yield_30d_pct - priorYield

  const mirrored = flows.map((f) => ({ ...f, redeemed_neg: -f.redeemed_usd }))
  const cumMinted = flows.reduce((x, f) => x + f.minted_usd, 0)
  const cumRedeemed = flows.reduce((x, f) => x + f.redeemed_usd, 0)

  const redistCumulative = (() => {
    let cum = 0
    return a.yield_daily.map((y) => {
      cum += y.redistributed_usd
      return { ...y, cumulative_usd: cum }
    })
  })()

  // Float yield — the ArchUSD engine's contribution to the distributable pool
  // (Economic Model v0.3): NAV × basis = float income; holder payments (the
  // retention-yield budget line) come out first; the remainder goes to the budget.
  const floatIncomeRunRate = a.reserve_nav_usd * (a.basis_yield_30d_pct / 100)
  const holderPaid30d = a.yield_redistributed_usd
  const floatIncome30d = a.yield_daily.reduce(
    (x, y, i) => x + (a.nav_daily[i].reserve_nav_usd * y.basis_apr_30d_pct) / 100 / 365,
    0,
  )
  const netToBudget30d = floatIncome30d - holderPaid30d
  const floatIncomeDaily = a.yield_daily.map((y, i) => ({
    date: y.date,
    income_usd: Math.round((a.nav_daily[i].reserve_nav_usd * y.basis_apr_30d_pct) / 100 / 365),
  }))

  return (
    <div className="space-y-5">
      {/* Tab title block */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-ink">ArchUSD</h2>
          <p className="mt-0.5 text-sm text-ink-3">
            Fully backed, the yield engine is producing, and the float stays on-chain.
          </p>
        </div>
        <span className="chip mt-1">Behind feature flag · ships when ArchUSD is live</span>
      </div>

      {/* Module 4.1 — Hero KPI row (5 cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="ArchUSD Supply"
          value={fmtUsd(a.supply_onchain_usd)}
          onMethodology={onMethodology}
          sub={
            <span className="flex gap-3">
              <Delta pct={change24h} suffix="24h" />
              <Delta pct={change7d} suffix="7d" />
            </span>
          }
        />
        <KpiCard
          label="Reserve NAV"
          value={fmtUsd(a.reserve_nav_usd)}
          tooltip={tooltips.reserveNav}
          onMethodology={onMethodology}
          sub={<span>attested {fmtTs(a.nav_last_attested).slice(11)}</span>}
        />
        <KpiCard
          label="Backing Ratio"
          value={fmtPct(a.backing_ratio_pct)}
          accent="green"
          tooltip={tooltips.backingRatio}
          onMethodology={onMethodology}
          sub={<span>reserve ÷ supply</span>}
        />
        <KpiCard
          label="Basis Yield (30d)"
          value={fmtPct(a.basis_yield_30d_pct)}
          tooltip={tooltips.basisYield}
          onMethodology={onMethodology}
          sub={<span>{fmtDelta(yieldDeltaPts)} pts prior · past performance</span>}
        />
        <KpiCard
          label="On-Chain Retention"
          value={fmtPct(a.retention_pct)}
          tooltip={tooltips.onChainRetention}
          onMethodology={onMethodology}
          sub={<span>of cumulative minted</span>}
        />
      </div>

      {/* Float Yield — the ArchUSD engine's contribution to the distributable pool */}
      <ChartPanel
        title="Float Yield"
        subtitle="The float's basis income is the system's biggest single earner. Holders are paid first; the remainder funds the budget."
        tooltip={tooltips.redistributableYield}
        onMethodology={onMethodology}
        withRange
      >
        {(range) => (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="flex flex-col justify-center">
              <div className="rounded-card border border-line bg-page p-4 font-mono">
                <div className="flex items-baseline justify-between text-xs text-ink-3">
                  <span>Float income (ARR)</span>
                  <span className="font-semibold text-ink">{fmtUsd(floatIncome30d * 12.17)}</span>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between text-xs text-ink-3">
                  <span>− Paid to holders</span>
                  <span className="font-semibold text-ink">{fmtUsd(holderPaid30d * 12.17)}</span>
                </div>
                <div className="mt-2.5 flex items-baseline justify-between border-t border-line pt-2.5">
                  <span className="text-xs text-ink-3">= Net to budget</span>
                  <span className="text-2xl font-semibold" style={{ color: colors.green }}>
                    {fmtUsd(netToBudget30d * 12.17)}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-ink-4">
                Annualized at the current basis rate ({fmtPct(a.basis_yield_30d_pct)}); {fmtUsd(floatIncomeRunRate)} on
                today&rsquo;s NAV. Retention and the basis rate are the two levers — both scale what the system can deploy.
              </p>
            </div>
            <div className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={sliceRange(floatIncomeDaily, range)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={axisTick} tickLine={false} />
                  <YAxis tickFormatter={(v) => fmtUsd(v)} tick={axisTick} tickLine={false} axisLine={false} width={48} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [fmtUsd(v), 'Daily float income']}
                    labelFormatter={fmtDateShort}
                  />
                  <Area type="monotone" dataKey="income_usd" stroke={colors.green} fill={colors.green} fillOpacity={0.12} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </ChartPanel>

      {/* Module 4.2 — Reserve NAV & composition */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartPanel
            title="Reserve NAV vs. On-Chain Supply"
            subtitle="The gap between the lines is the overcollateralization."
            tooltip={tooltips.reserveNav}
            onMethodology={onMethodology}
            withRange
          >
            {(range) => (
              <div>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={sliceRange(a.nav_daily, range)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={colors.grid} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={axisTick} tickLine={false} />
                    <YAxis tickFormatter={(v) => fmtUsd(v)} tick={axisTick} tickLine={false} axisLine={false} width={54} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtUsd(v)} labelFormatter={fmtDateShort} />
                    <Legend wrapperStyle={legendStyle} />
                    <Line type="monotone" dataKey="reserve_nav_usd" name="Reserve NAV" stroke={colors.navy} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="supply_onchain_usd" name="On-chain supply" stroke={colors.orange} strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
                <p className="mt-2 font-mono text-[10px] text-ink-4">
                  NAV attested {fmtTs(a.nav_last_attested)} · custodian feed (mock)
                </p>
              </div>
            )}
          </ChartPanel>
        </div>

        <section className="card p-5">
          <h3 className="text-[15px] font-semibold text-ink">Reserve Composition</h3>
          <p className="mt-0.5 text-xs text-ink-3">Off-chain reserve assets.</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={a.reserve_composition} dataKey="nav_usd" nameKey="asset" innerRadius={48} outerRadius={76} paddingAngle={2} stroke="none">
                {a.reserve_composition.map((c, i) => (
                  <Cell key={c.asset} fill={COMPOSITION_COLORS[i % COMPOSITION_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtUsd(v)} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="mt-2 space-y-1.5 text-xs">
            {a.reserve_composition.map((c, i) => (
              <li key={c.asset} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COMPOSITION_COLORS[i % COMPOSITION_COLORS.length] }} />
                <span className="flex-1 text-ink-2">{c.asset}</span>
                <span className="num font-semibold">{c.share_pct.toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Module 4.3 — Retention & flows (signature module) */}
      <ChartPanel
        title="Retention & Flows"
        subtitle="ArchUSD that stays on-chain keeps its reserves earning; redeemed float earns nothing."
        tooltip={tooltips.onChainRetention}
        onMethodology={onMethodology}
        withRange
      >
        {(range) => (
          <div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={sliceRange(mirrored, range)} stackOffset="sign" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={colors.grid} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={axisTick} tickLine={false} />
                    <YAxis tickFormatter={(v) => fmtUsd(v)} tick={axisTick} tickLine={false} axisLine={false} width={54} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelFormatter={fmtDateShort}
                      formatter={(v: number, name: string) => [fmtUsd(Math.abs(v)), name]}
                    />
                    <Legend wrapperStyle={legendStyle} />
                    <ReferenceLine y={0} stroke={colors.border} />
                    <Bar dataKey="minted_usd" name="Minted" stackId="f" fill={colors.navy} />
                    <Bar dataKey="redeemed_neg" name="Redeemed" stackId="f" fill={colors.orange} />
                    <Line type="monotone" dataKey="net_usd" name="Net flow" stroke={colors.slate} strokeWidth={1.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col justify-center">
                <div className="text-[11px] text-ink-3">On-chain retention</div>
                <div className="num text-3xl font-semibold" style={{ color: colors.green }}>
                  {fmtPct(a.retention_pct)}
                </div>
                <RetentionSparkline values={flows.map((f) => f.retention_pct)} />
                <p className="mt-3 text-[11px] leading-relaxed text-ink-4">
                  {fmtUsd(cumRedeemed)} redeemed of {fmtUsd(cumMinted)} minted, all-time.
                </p>
              </div>
            </div>
            {/* Three-step explainer strip — one line each */}
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              {['ArchUSD stays on-chain', 'reserve float compounds', 'more yield flows back to participants'].map(
                (step, i) => (
                  <div key={step} className="rounded-card border border-line bg-page px-4 py-2.5 text-xs">
                    <span className="num font-semibold text-orange">{i + 1}.</span>{' '}
                    <span className="text-ink-2">{step}</span>
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </ChartPanel>

      {/* Module 4.4 — Basis yield & redistribution */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartPanel
          title="Basis Yield (30d annualized)"
          subtitle="Rate earned by the off-chain reserve strategy. Past performance; not a rate promise."
          tooltip={tooltips.basisYield}
          onMethodology={onMethodology}
          withRange
        >
          {(range) => (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={sliceRange(a.yield_daily, range)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={axisTick} tickLine={false} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={axisTick} tickLine={false} axisLine={false} width={40} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toFixed(1)}%`, 'Basis APR (30d)']} labelFormatter={fmtDateShort} />
                <Line type="monotone" dataKey="basis_apr_30d_pct" stroke={colors.orange} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>

        <ChartPanel
          title="Retention Yield Paid"
          subtitle="Cumulative paid to ArchUSD holders — the budget's retention line, keeping dollars on-chain."
          withRange
        >
          {(range) => (
            <div>
              <div className="num text-2xl font-semibold">{fmtUsd(a.yield_redistributed_usd, { full: true })}</div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={sliceRange(redistCumulative, range)} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={axisTick} tickLine={false} />
                  <YAxis tickFormatter={(v) => fmtUsd(v)} tick={axisTick} tickLine={false} axisLine={false} width={50} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtUsd(v)} labelFormatter={fmtDateShort} />
                  <Area type="monotone" dataKey="cumulative_usd" name="Redistributed (cumulative)" stroke={colors.gold} fill={colors.gold} fillOpacity={0.3} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartPanel>
      </div>

      <DemoDataFootnote />
    </div>
  )
}

function RetentionSparkline({ values }: { values: number[] }) {
  const w = 160
  const h = 28
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const points = values
    .map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - min) / span) * (h - 4)).toFixed(1)}`)
    .join(' ')
  return (
    <svg width={w} height={h} aria-hidden="true" className="mt-2">
      <polyline points={points} fill="none" stroke={colors.green} strokeWidth={1.5} />
    </svg>
  )
}
