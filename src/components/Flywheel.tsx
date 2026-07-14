import { colors } from '../theme'
import { fmtUsd, fmtDelta, fmtRatio } from '../lib/format'

interface Props {
  tvlUsd: number
  incomeRunRateUsd: number // income as estimated ARR — the reported metric
  spendRunRateUsd: number // wedge + retention yield, annualized
  netInflow30dUsd: number
  attraction: number // computed from same-period (30d) flows upstream
  deltas: { income: number; spend: number; inflow: number }
}

// Geometry: 4 nodes N/E/S/W on a ring around the Network Value hub.
const CX = 380
const CY = 330
const R = 218

const pt = (deg: number, r = R) => ({
  x: CX + r * Math.cos((deg * Math.PI) / 180),
  y: CY + r * Math.sin((deg * Math.PI) / 180),
})

function arc(fromDeg: number, toDeg: number): string {
  const a = pt(fromDeg)
  const b = pt(toDeg)
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} A ${R} ${R} 0 0 1 ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
}

/** The flywheel as the budget machine's summary graphic: capital produces
 * income (two engines), income funds the budget, the budget attracts capital,
 * capital deepens the base — network value accumulating at the hub. */
export default function Flywheel({
  tvlUsd,
  incomeRunRateUsd,
  spendRunRateUsd,
  netInflow30dUsd,
  attraction,
  deltas,
}: Props) {
  const nodes = [
    { n: 1, title: 'Money on Arch', sub: 'deposits, collateral & liquidity', value: fmtUsd(tvlUsd), tag: 'TVL', angle: -90 },
    { n: 2, title: 'It Makes Money', sub: 'invested reserves + fees', value: `${fmtUsd(incomeRunRateUsd)} ARR`, tag: 'est.', angle: 0 },
    { n: 3, title: 'Income Buys Best Rates', sub: 'rates & rewards, paid for', value: `${fmtUsd(spendRunRateUsd)} / yr`, tag: 'pace', angle: 90 },
    { n: 4, title: 'Best Rates Bring Money', sub: 'new depositors & lenders', value: `${fmtUsd(netInflow30dUsd)} net`, tag: '30d', angle: 180 },
  ]

  const edges = [
    {
      arc: arc(-64, -26),
      labelAt: pt(-45, R + 44),
      caption: 'EARNS',
      value: `${fmtUsd(incomeRunRateUsd)} ARR · ${fmtDelta(deltas.income, 0)}`,
      anchor: 'start',
    },
    {
      arc: arc(26, 64),
      labelAt: pt(45, R + 44),
      caption: 'PAYS FOR',
      value: `${fmtUsd(spendRunRateUsd)} / yr · ${fmtDelta(deltas.spend, 0)}`,
      anchor: 'start',
    },
    {
      arc: arc(116, 154),
      labelAt: pt(135, R + 44),
      caption: 'ATTRACTS',
      value: `${fmtRatio(attraction)} per $1 spent`,
      anchor: 'end',
    },
    {
      arc: arc(-154, -116),
      labelAt: pt(-135, R + 44),
      caption: 'GROWS THE BASE',
      value: `${fmtUsd(netInflow30dUsd)} · ${fmtDelta(deltas.inflow, 0)}`,
      anchor: 'end',
    },
  ] as const

  const NODE_W = 200
  const NODE_H = 92

  return (
    <svg
      viewBox="0 0 760 660"
      role="img"
      aria-label="Arch flywheel: capital produces income, income funds the budget, the budget attracts capital, capital deepens the base — network value grows at the center"
      className="w-full"
    >
      <defs>
        <marker id="fw-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={colors.orange} />
        </marker>
      </defs>

      {edges.map((e, i) => (
        <path
          key={i}
          d={e.arc}
          fill="none"
          stroke={colors.orange}
          strokeWidth={2}
          strokeDasharray="2 6"
          strokeLinecap="round"
          markerEnd="url(#fw-arrow)"
          className="flow-edge"
        />
      ))}

      {edges.map((e, i) => (
        <g key={`l${i}`} textAnchor={e.anchor as 'start' | 'end'} fontFamily="IBM Plex Mono, monospace">
          <text x={e.labelAt.x} y={e.labelAt.y} fontSize="10" fill={colors.orange} fontWeight={600} letterSpacing="0.8">
            {e.caption}
          </text>
          <text x={e.labelAt.x} y={e.labelAt.y + 16} fontSize="12" fill={colors.ink} fontWeight={600}>
            {e.value}
          </text>
        </g>
      ))}

      {/* Hub — Network Value */}
      <circle cx={CX} cy={CY} r={104} fill={colors.card} stroke={colors.border} strokeWidth={1} />
      <text x={CX} y={CY - 30} textAnchor="middle" fontSize="10" fill={colors.inkMuted} fontWeight={600} letterSpacing="1.5" fontFamily="IBM Plex Mono, monospace">
        NETWORK VALUE
      </text>
      <text x={CX} y={CY + 4} textAnchor="middle" fontSize="27" fill={colors.navy} fontWeight={600} fontFamily="IBM Plex Mono, monospace">
        {fmtUsd(tvlUsd)}
      </text>
      <text x={CX} y={CY + 24} textAnchor="middle" fontSize="11" fill={colors.inkMuted} fontFamily="IBM Plex Mono, monospace">
        TVL
      </text>
      <text x={CX} y={CY + 46} textAnchor="middle" fontSize="12" fill={colors.orange} fontWeight={600} fontFamily="IBM Plex Mono, monospace">
        {fmtUsd(incomeRunRateUsd)} income ARR
      </text>

      {nodes.map((node) => {
        const c = pt(node.angle)
        const x = c.x - NODE_W / 2
        const y = c.y - NODE_H / 2
        return (
          <g key={node.n}>
            <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={13} fill={colors.card} stroke={colors.border} strokeWidth={1.5} />
            <circle cx={x + 22} cy={y + 24} r={11} fill={colors.orange} />
            <text x={x + 22} y={y + 28} textAnchor="middle" fontSize="11" fill="#FFFFFF" fontWeight={700} fontFamily="IBM Plex Mono, monospace">
              {node.n}
            </text>
            <text x={x + 40} y={y + 22} fontSize="13" fill={colors.ink} fontWeight={600}>
              {node.title}
            </text>
            <text x={x + 40} y={y + 37} fontSize="10" fill={colors.inkMuted}>
              {node.sub}
            </text>
            <text x={x + 16} y={y + 70} fontSize="14" fill={colors.orange} fontWeight={600} fontFamily="IBM Plex Mono, monospace">
              {node.value}
            </text>
            <text x={x + NODE_W - 16} y={y + 70} textAnchor="end" fontSize="10" fill={colors.inkFaint} fontFamily="IBM Plex Mono, monospace">
              · {node.tag}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
