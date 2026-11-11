import type { HealthBandId, LoanBook } from '../data/snapshot'
import { fmtUsd, fmtNum, fmtPct } from '../lib/format'
import { definitions } from '../lib/definitions'
import { palette } from '../theme'

interface Props {
  book: LoanBook
}

const bandLabels: Record<HealthBandId, string> = {
  liquidatable: 'Can be liquidated now',
  under_10: 'Under 10%',
  from_10_to_25: '10% to 25%',
  from_25_to_50: '25% to 50%',
  over_50: 'Over 50%',
  unrated: 'No reading',
}

/** The accounts in debt by liquidation buffer, in aggregate: counts and debt, no accounts named. */
export default function LoanHealth({ book }: Props) {
  const bands = book.health_bands.filter((b) => b.id !== 'unrated' || b.accounts > 0)
  const unrated = book.health_bands.find((b) => b.id === 'unrated')?.accounts ?? 0
  const debtMax = Math.max(...bands.map((b) => b.borrowed_usd), 0)
  return (
    <section className="card min-w-0 p-4">
      <h3 className="text-[15px] font-medium">Loan Health</h3>
      <p className="mt-0.5 text-[13px] text-ink-2">
        The {fmtNum(book.accounts)} accounts in debt now, by liquidation buffer.
        {book.lowest_buffer_pct !== null && ` The smallest buffer is ${fmtPct(book.lowest_buffer_pct)}.`}
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line text-xs text-ink-2">
              <th className="px-2 py-2 font-medium">Liquidation buffer</th>
              <th className="px-2 py-2 text-right font-medium">Accounts</th>
              <th className="px-2 py-2 text-right font-medium">Debt</th>
              <th className="w-2/5 px-2 py-2 font-medium" aria-hidden="true" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {bands.map((b) => (
              <tr key={b.id}>
                <td className="px-2 py-2 font-medium">{bandLabels[b.id]}</td>
                <td className="num px-2 py-2 text-right">{fmtNum(b.accounts)}</td>
                <td className="num px-2 py-2 text-right">{fmtUsd(b.borrowed_usd)}</td>
                <td className="px-2 py-2" aria-hidden="true">
                  <div className="h-1.5 rounded-full bg-soft-2">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${debtMax > 0 ? (b.borrowed_usd / debtMax) * 100 : 0}%`,
                        background: palette[0],
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-3xl px-2 text-xs text-ink-2">
        {definitions.liquidationBuffer}
        {unrated > 0 && ' No reading: the account holds a token that has no reference price.'}
      </p>
    </section>
  )
}
