import type { HealthBandId, LoanBook } from '../data/snapshot'
import { fmtNum, fmtPct, usdColumn } from '../lib/format'
import { definitions } from '../lib/definitions'
import { palette } from '../theme'
import Panel from './Panel'
import SourceLine from './SourceLine'

interface Props {
  book: LoanBook
  /** The loan book on the analytics API. */
  apiHref: string
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
export default function LoanHealth({ book, apiHref }: Props) {
  const bands = book.health_bands.filter((b) => b.id !== 'unrated' || b.accounts > 0)
  const unrated = book.health_bands.find((b) => b.id === 'unrated')?.accounts ?? 0
  const debtMax = Math.max(...bands.map((b) => b.borrowed_usd), 0)
  const debt = usdColumn(bands.map((b) => b.borrowed_usd))
  return (
    <Panel
      id="loan-health"
      title="Loan health"
      subtitle={
        `The ${fmtNum(book.accounts)} accounts in debt now, by how far their collateral can fall before liquidation` +
        (book.lowest_buffer_pct !== null ? `. The smallest buffer is ${fmtPct(book.lowest_buffer_pct)}.` : '')
      }
      definition={definitions.liquidationBuffer}
      source={
        <SourceLine
          from="Arch Prime Analytics"
          links={[{ label: 'Accounts in debt (API)', href: apiHref }]}
          definition={definitions.liquidationBuffer}
        />
      }
    >
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-line text-xs text-ink-2">
            <th className="py-2 pr-2 font-medium">Liquidation buffer</th>
            <th className="px-2 py-2 text-right font-medium">Accounts</th>
            <th className="py-2 pl-2 text-right font-medium sm:px-2">Debt</th>
            <th className="hidden w-2/5 py-2 pl-2 font-medium sm:table-cell" aria-hidden="true" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {bands.map((b) => (
            <tr key={b.id}>
              <td className="py-2 pr-2 font-medium">{bandLabels[b.id]}</td>
              <td className="num px-2 py-2 text-right">{fmtNum(b.accounts)}</td>
              <td className="num py-2 pl-2 text-right sm:px-2">{debt(b.borrowed_usd)}</td>
              <td className="hidden py-2 pl-2 sm:table-cell" aria-hidden="true">
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
      {unrated > 0 && (
        <p className="mt-3 max-w-3xl text-xs text-ink-2">
          No reading: the account holds a token that has no reference price, so no buffer can be computed for it.
        </p>
      )}
    </Panel>
  )
}
