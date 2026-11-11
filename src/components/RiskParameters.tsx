import type { EmodePairing, Market } from '../data/snapshot'
import { fmtPct } from '../lib/format'
import { definitions, emodeDefinition } from '../lib/definitions'
import DataTable, { Stacked, type Column } from './DataTable'

interface Props {
  markets: Market[]
  /** Null where the analytics build does not serve e-mode settings. */
  pairings: EmodePairing[] | null
}

const weight = (n: number) => n.toFixed(2)
const weights = (init: number, maint: number) => `${weight(init)} / ${weight(maint)}`

const marketColumns: Column<Market>[] = [
  { key: 'market', header: 'Market', cell: (m) => m.symbol },
  {
    key: 'collateral',
    header: 'Collateral weight (initial / maint.)',
    primary: true,
    cell: (m) => (m.asset_weight_init > 0 ? weights(m.asset_weight_init, m.asset_weight_maint) : 'Not collateral'),
  },
  {
    key: 'liability',
    header: 'Liability weight (initial / maint.)',
    primary: true,
    cell: (m) => weights(m.liability_weight_init, m.liability_weight_maint),
  },
  { key: 'optimal', header: 'Optimal utilization', cell: (m) => fmtPct(m.optimal_utilization_pct, 0) },
  { key: 'plateau', header: 'Rate at optimal', cell: (m) => fmtPct(m.plateau_rate_pct, 0) },
  { key: 'max', header: 'Max rate', cell: (m) => fmtPct(m.max_rate_pct, 0) },
  { key: 'fee', header: 'Liquidation fee', cell: (m) => fmtPct(m.liquidation_fee_pct) },
  {
    key: 'oracle',
    header: 'Oracle',
    cell: (m) => (
      <Stacked top={m.oracle} sub={m.oracle_max_age_s !== null && `price no older than ${m.oracle_max_age_s} s`} />
    ),
  },
  { key: 'borrowing', header: 'Borrowing', primary: true, cell: (m) => (m.borrowable ? 'Enabled' : 'Off') },
]

const pairingColumns: Column<EmodePairing>[] = [
  { key: 'collateral', header: 'Collateral', cell: (p) => p.collateral },
  { key: 'debt', header: 'When every debt is in', align: 'left', primary: true, cell: (p) => p.debt },
  {
    key: 'weights',
    header: 'Collateral weight (initial / maint.)',
    cell: (p) => weights(p.asset_weight_init, p.asset_weight_maint),
  },
  { key: 'max_ltv', header: 'Borrow up to', primary: true, cell: (p) => fmtPct(p.max_ltv_pct) },
  { key: 'liquidation_ltv', header: 'Liquidation from', primary: true, cell: (p) => fmtPct(p.liquidation_ltv_pct) },
]

/** The program's risk configuration per bank, as read from the chain. */
export default function RiskParameters({ markets, pairings }: Props) {
  const example = ltvExample(markets)
  const listed = pairings !== null && pairings.length > 0
  return (
    <div>
      <DataTable columns={marketColumns} rows={markets} rowKey={(m) => m.address} tableFrom="lg" />
      {listed && (
        <div className="mt-4">
          <DataTable
            columns={pairingColumns}
            rows={pairings}
            rowKey={(p) => `${p.collateral}/${p.debt}`}
            tableFrom="lg"
            caption="Higher collateral weights by pairing (e-mode)"
          />
        </div>
      )}
      <p className="mt-3 max-w-3xl text-xs text-ink-2">
        {definitions.riskWeights.long}
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
