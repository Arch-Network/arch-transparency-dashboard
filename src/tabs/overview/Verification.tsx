import type { ReactNode } from 'react'
import type { Snapshot } from '../../data/snapshot'
import Panel from '../../components/Panel'
import SourceAges from '../../components/SourceAges'
import type { SourceLink } from '../../components/SourceLine'
import { downloadCsv, type CsvRow } from '../../lib/csv'
import { SNAPSHOT_URL, analyticsLinks, explorerLink } from '../../lib/links'
import { usePageHref } from '../../lib/range'

/** Where every figure comes from, how old each source is, and how to read
 * the sources first-hand or keep a copy. */
export default function Verification({ data }: { data: Snapshot }) {
  const { meta, series, lend, tokens } = data
  const href = usePageHref()
  const api = analyticsLinks(meta)

  const analytics: SourceLink[] = [
    { label: 'Lending markets', href: api.markets },
    { label: 'Lending totals', href: api.lendingTotals },
    ...(lend.loan_book ? [{ label: 'Accounts in debt', href: api.loanBook }] : []),
    { label: 'Swap pools', href: api.pools },
    { label: 'Vaults', href: api.vaults },
    { label: 'Daily TVL', href: api.protocolDaily('tvl') },
    { label: 'Daily volume', href: api.protocolDaily('volume') },
    { label: 'Daily swap fees', href: api.protocolDaily('revenue') },
    { label: 'Daily lender interest', href: api.protocolDaily('yield') },
  ]
  const explorer: SourceLink[] = [
    { label: 'Arch Explorer', href: meta.explorer_url },
    ...(tokens
      ? [
          { label: 'aUSD token', href: explorerLink(meta, 'tokens', tokens.ausd_mint) },
          { label: 'aBTC token', href: explorerLink(meta, 'tokens', tokens.abtc_mint) },
        ]
      : []),
  ]
  const downloads: { label: string; filename: string; rows: CsvRow[] }[] = [
    { label: 'Daily TVL', filename: 'arch-prime-tvl-daily.csv', rows: series.tvl_daily.map((r) => ({ ...r })) },
    { label: 'Daily volume', filename: 'arch-prime-volume-daily.csv', rows: series.volume_daily.map((r) => ({ ...r })) },
    { label: 'Daily swap fees', filename: 'arch-prime-swap-fees-daily.csv', rows: series.fees_daily.map((r) => ({ ...r })) },
    {
      label: 'Daily lender interest',
      filename: 'arch-prime-lender-interest-daily.csv',
      rows: series.interest_daily.map((r) => ({ ...r })),
    },
    ...(series.tx_daily
      ? [{ label: 'Daily Arch transactions', filename: 'arch-transactions-daily.csv', rows: series.tx_daily.map((r) => ({ ...r })) }]
      : []),
  ]

  return (
    <Panel
      id="verify"
      title="Check these figures"
      subtitle="Protocol figures come from Arch Prime Analytics, chain and token figures from the Arch Explorer. Read either first-hand, or keep a copy."
    >
      <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2 xl:grid-cols-4">
        <Group title="Sources and their age">
          <SourceAges data={data} />
        </Group>
        <Group title="Arch Prime Analytics API">
          <Links links={analytics} />
        </Group>
        <Group title="Arch Explorer and this page">
          <Links links={[...explorer, { label: 'This page’s data (JSON)', href: SNAPSHOT_URL }]} />
        </Group>
        <Group title="Keep a copy">
          <ul className="space-y-2 text-[13px]">
            {downloads.map((d) => (
              <li key={d.filename}>
                <button type="button" className="link" onClick={() => downloadCsv(d.filename, d.rows)}>
                  {d.label} (CSV)
                </button>
              </li>
            ))}
            <li>
              <a className="link" href={href('methodology')}>
                How each figure is defined
              </a>
            </li>
          </ul>
        </Group>
      </div>
    </Panel>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <h4 className="mb-2 text-[13px] font-medium">{title}</h4>
      {children}
    </div>
  )
}

function Links({ links }: { links: SourceLink[] }) {
  return (
    <ul className="space-y-2 text-[13px]">
      {links.map(
        (l) =>
          l.href && (
            <li key={l.label}>
              <a className="link" href={l.href} target="_blank" rel="noreferrer">
                {l.label}
              </a>
            </li>
          ),
      )}
    </ul>
  )
}
