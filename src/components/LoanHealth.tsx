import type { HealthBandId, LoanBook } from '../data/snapshot'
import { fmtNum, fmtPct, usdColumn } from '../lib/format'
import { definitions } from '../lib/definitions'
import { colors, productColors } from '../theme'
import Panel from './Panel'
import SourceLine from './SourceLine'
import { ProgressBar } from './ui'

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

const bandColor = (id: HealthBandId): string => {
  if (id === 'liquidatable') return colors.down
  if (id === 'under_10') return colors.warn
  if (id === 'unrated') return colors.ink3
  return productColors.lend
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
      <div className="-mx-5 overflow-x-auto sm:-mx-6">
        <table className="ap-table">
          <thead>
            <tr>
              <th className="pl-5 pr-3 text-left sm:pl-6">Liquidation buffer</th>
              <th className="px-3 text-right">Accounts</th>
              <th className="pl-3 pr-5 text-right sm:px-3">Debt</th>
              <th className="hidden w-2/5 pl-3 pr-5 sm:table-cell sm:pr-6" aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {bands.map((b) => (
              <tr key={b.id}>
                <td className="pl-5 pr-3 font-medium text-ink sm:pl-6">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: bandColor(b.id) }}
                    />
                    {bandLabels[b.id]}
                  </span>
                </td>
                <td className="num px-3 text-right font-medium text-ink">{fmtNum(b.accounts)}</td>
                <td className="num pl-3 pr-5 text-right font-medium text-ink sm:px-3">{debt(b.borrowed_usd)}</td>
                <td className="hidden pl-3 pr-5 align-middle sm:table-cell sm:pr-6" aria-hidden="true">
                  <ProgressBar
                    pct={debtMax > 0 ? (b.borrowed_usd / debtMax) * 100 : 0}
                    color={bandColor(b.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {unrated > 0 && (
        <p className="mt-3 max-w-3xl text-[12px] text-ink-3">
          No reading: the account holds a token that has no reference price, so no buffer can be computed for it.
        </p>
      )}
    </Panel>
  )
}
