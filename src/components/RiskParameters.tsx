import type { EmodePairing, Market } from '../data/snapshot'
import { fmtPct } from '../lib/format'
import { definitions, emodeDefinition } from '../lib/definitions'

interface Props {
  markets: Market[]
  /** Null where the analytics build does not serve e-mode settings. */
  pairings: EmodePairing[] | null
}

const weight = (n: number) => n.toFixed(2)

/** The program's risk configuration per bank, as read from the chain. */
export default function RiskParameters({ markets, pairings }: Props) {
  const example = ltvExample(markets)
  const listed = pairings !== null && pairings.length > 0
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line text-xs text-ink-2">
              <th className="px-2 py-2 font-medium">Market</th>
              <th className="px-2 py-2 text-right font-medium">Collateral weight (initial / maint.)</th>
              <th className="px-2 py-2 text-right font-medium">Liability weight (initial / maint.)</th>
              <th className="px-2 py-2 text-right font-medium">Optimal utilization</th>
              <th className="px-2 py-2 text-right font-medium">Rate at optimal</th>
              <th className="px-2 py-2 text-right font-medium">Max rate</th>
              <th className="px-2 py-2 text-right font-medium">Liquidation fee</th>
              <th className="px-2 py-2 text-right font-medium">Borrowing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {markets.map((m) => (
              <tr key={m.address}>
                <td className="px-2 py-2 font-medium">{m.symbol}</td>
                <td className="px-2 py-2 text-right">
                  {m.asset_weight_init > 0
                    ? `${weight(m.asset_weight_init)} / ${weight(m.asset_weight_maint)}`
                    : 'Not collateral'}
                </td>
                <td className="px-2 py-2 text-right">
                  {weight(m.liability_weight_init)} / {weight(m.liability_weight_maint)}
                </td>
                <td className="px-2 py-2 text-right">{fmtPct(m.optimal_utilization_pct, 0)}</td>
                <td className="px-2 py-2 text-right">{fmtPct(m.plateau_rate_pct, 0)}</td>
                <td className="px-2 py-2 text-right">{fmtPct(m.max_rate_pct, 0)}</td>
                <td className="px-2 py-2 text-right">{fmtPct(m.liquidation_fee_pct)}</td>
                <td className="px-2 py-2 text-right">{m.borrowable ? 'Enabled' : 'Off'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {listed && <EmodePairings pairings={pairings} />}
      <p className="mt-3 max-w-3xl px-2 text-xs text-ink-2">
        {definitions.riskWeights}
        {example && (
          <>
            {' '}
            Borrowing {example.debt} against {example.collateral}: up to {fmtPct(example.maxLtvPct)} of the
            collateral&rsquo;s value, with liquidation possible from {fmtPct(example.liquidationLtvPct)}.
          </>
        )}{' '}
        {emodeDefinition(pairings, listed)}
      </p>
    </div>
  )
}

/** The pairings the program weighs above the base weights, with the limits they give. */
function EmodePairings({ pairings }: { pairings: EmodePairing[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-[13px]">
        <caption className="px-2 pb-1 text-left text-xs font-medium text-ink-2">
          Higher collateral weights by pairing (e-mode)
        </caption>
        <thead>
          <tr className="border-b border-line text-xs text-ink-2">
            <th className="px-2 py-2 font-medium">Collateral</th>
            <th className="px-2 py-2 font-medium">When every debt is in</th>
            <th className="px-2 py-2 text-right font-medium">Collateral weight (initial / maint.)</th>
            <th className="px-2 py-2 text-right font-medium">Borrow up to</th>
            <th className="px-2 py-2 text-right font-medium">Liquidation from</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {pairings.map((p) => (
            <tr key={`${p.collateral}/${p.debt}`}>
              <td className="px-2 py-2 font-medium">{p.collateral}</td>
              <td className="px-2 py-2">{p.debt}</td>
              <td className="px-2 py-2 text-right">
                {weight(p.asset_weight_init)} / {weight(p.asset_weight_maint)}
              </td>
              <td className="px-2 py-2 text-right">{fmtPct(p.max_ltv_pct)}</td>
              <td className="px-2 py-2 text-right">{fmtPct(p.liquidation_ltv_pct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Loan-to-value limits for the largest market borrowed against the next largest. */
function ltvExample(markets: Market[]) {
  const [debt, collateral] = markets.filter((m) => m.borrowable && m.asset_weight_init > 0)
  if (!debt || !collateral) return null
  return {
    debt: debt.symbol,
    collateral: collateral.symbol,
    maxLtvPct: (collateral.asset_weight_init / debt.liability_weight_init) * 100,
    liquidationLtvPct: (collateral.asset_weight_maint / debt.liability_weight_maint) * 100,
  }
}
