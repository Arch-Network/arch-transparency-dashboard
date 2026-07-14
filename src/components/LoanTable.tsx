import { useMemo, useState } from 'react'
import type { Loan } from '../types'
import { colors } from '../theme'
import { fmtUsd } from '../lib/format'

interface Props {
  loans: Loan[]
}

type SortKey = keyof Pick<
  Loan,
  'collateral_btc' | 'debt_usd' | 'ltv_pct' | 'dist_to_liq_pct' | 'liq_price_usd'
>

const PAGE_SIZE = 25

const columns: { key: SortKey | 'owner_trunc'; label: string; sortable: boolean }[] = [
  { key: 'owner_trunc', label: 'Owner', sortable: false },
  { key: 'collateral_btc', label: 'Collateral (BTC)', sortable: true },
  { key: 'debt_usd', label: 'Debt (USD)', sortable: true },
  { key: 'ltv_pct', label: 'Current LTV', sortable: true },
  { key: 'dist_to_liq_pct', label: 'Dist. to Liq.', sortable: true },
  { key: 'liq_price_usd', label: 'Liq. Price', sortable: true },
]

const COLLATERAL_FILTERS = [
  { label: 'All', min: 0 },
  { label: '≥ 0.5 BTC', min: 0.5 },
  { label: '≥ 1 BTC', min: 1 },
  { label: '≥ 5 BTC', min: 5 },
]

const LTV_FILTERS = [
  { label: 'All', min: 0, max: 100 },
  { label: '< 40%', min: 0, max: 40 },
  { label: '40–60%', min: 40, max: 60 },
  { label: '60–80%', min: 60, max: 80 },
  { label: '> 80%', min: 80, max: 100 },
]

/** Open loan book (master §3 Module 3.4): sortable, filterable, paginated.
 * Default sort: distance to liquidation, ascending. */
export default function LoanTable({ loans }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('dist_to_liq_pct')
  const [asc, setAsc] = useState(true)
  const [collateralIdx, setCollateralIdx] = useState(0)
  const [ltvIdx, setLtvIdx] = useState(0)
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const c = COLLATERAL_FILTERS[collateralIdx]
    const l = LTV_FILTERS[ltvIdx]
    const rows = loans.filter(
      (loan) => loan.collateral_btc >= c.min && loan.ltv_pct >= l.min && loan.ltv_pct <= l.max,
    )
    rows.sort((a, b) => (asc ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]))
    return rows
  }, [loans, sortKey, asc, collateralIdx, ltvIdx])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const clampedPage = Math.min(page, pages - 1)
  const view = filtered.slice(clampedPage * PAGE_SIZE, (clampedPage + 1) * PAGE_SIZE)

  const sortBy = (k: SortKey) => {
    if (k === sortKey) setAsc(!asc)
    else {
      setSortKey(k)
      setAsc(true)
    }
    setPage(0)
  }

  const selectCls =
    'rounded-md border border-line bg-card px-2 py-1 font-mono text-[11px] text-ink focus:border-orange focus:outline-none'

  const distColor = (pts: number) =>
    pts <= 2 ? colors.red : pts <= 10 ? colors.orange : colors.ink

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] text-ink-3">
        <span>
          {filtered.length} of {loans.length} outstanding loans · showing loans nearest liquidation.
        </span>
        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-1.5">
            Min collateral
            <select
              className={selectCls}
              value={collateralIdx}
              onChange={(e) => {
                setCollateralIdx(Number(e.target.value))
                setPage(0)
              }}
            >
              {COLLATERAL_FILTERS.map((f, i) => (
                <option key={f.label} value={i}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            LTV
            <select
              className={selectCls}
              value={ltvIdx}
              onChange={(e) => {
                setLtvIdx(Number(e.target.value))
                setPage(0)
              }}
            >
              {LTV_FILTERS.map((f, i) => (
                <option key={f.label} value={i}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-xs">
          <thead>
            <tr className="border-b border-line text-[10px] uppercase tracking-wider text-ink-4">
              {columns.map((c, i) => (
                <th key={c.key} className={'py-2 font-medium ' + (i === 0 ? 'pr-4' : 'pr-4 text-right')}>
                  {c.sortable ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-orange"
                      onClick={() => sortBy(c.key as SortKey)}
                    >
                      {c.label}
                      {sortKey === c.key && <span className="text-orange">{asc ? '↑' : '↓'}</span>}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono">
            {view.map((l) => (
              <tr key={l.owner_trunc + l.debt_usd} className="border-b border-line-faint">
                <td className="py-2.5 pr-4 font-semibold" style={{ color: colors.navy }}>
                  {l.owner_trunc}
                </td>
                <td className="py-2.5 pr-4 text-right">{l.collateral_btc.toFixed(2)}</td>
                <td className="py-2.5 pr-4 text-right">{fmtUsd(l.debt_usd)}</td>
                <td className="py-2.5 pr-4 text-right">{l.ltv_pct.toFixed(1)}%</td>
                <td className="py-2.5 pr-4 text-right font-semibold" style={{ color: distColor(l.dist_to_liq_pct) }}>
                  {l.dist_to_liq_pct.toFixed(1)} pp
                </td>
                <td className="py-2.5 pr-4 text-right">{fmtUsd(l.liq_price_usd, { full: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-ink-3">
        <button
          type="button"
          className="rounded-md border border-line px-3 py-1 disabled:opacity-40"
          disabled={clampedPage === 0}
          onClick={() => setPage(clampedPage - 1)}
        >
          Previous
        </button>
        <span>
          Page {clampedPage + 1} of {pages}
        </span>
        <button
          type="button"
          className="rounded-md border border-line px-3 py-1 disabled:opacity-40"
          disabled={clampedPage >= pages - 1}
          onClick={() => setPage(clampedPage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}
