import type { ReactNode } from 'react'
import type { Snapshot } from '../../data/snapshot'
import Panel from '../../components/Panel'
import SourceAges from '../../components/SourceAges'
import type { SourceLink } from '../../components/SourceLine'
import { downloadCsv, type CsvRow } from '../../lib/csv'
import { SNAPSHOT_URL, analyticsLinks, explorerLink, perpsLinks } from '../../lib/links'
import { usePageHref } from '../../lib/range'

/** Compact verification & export footer card: source freshness, direct API links, and CSV downloads. */
export default function Verification({ data }: { data: Snapshot }) {
  const { meta, series, lend, tokens, perps, theya } = data
  const href = usePageHref()
  const api = analyticsLinks(meta)
  const perpsApi = perpsLinks(meta)

  const analytics: SourceLink[] = [
    { label: 'Lending markets', href: api.markets },
    { label: 'Lending totals', href: api.lendingTotals },
    ...(lend.loan_book ? [{ label: 'Accounts in debt', href: api.loanBook }] : []),
    { label: 'Swap pools', href: api.pools },
    { label: 'Vaults', href: api.vaults },
    ...(theya ? [{ label: 'Prime transparency / Theya', href: theya.source_url }] : []),
    { label: 'Daily TVL', href: api.protocolDaily('tvl') },
    { label: 'Daily volume', href: api.protocolDaily('volume') },
    { label: 'Daily swap fees', href: api.protocolDaily('revenue') },
    { label: 'Daily lender interest', href: api.protocolDaily('yield') },
    ...(perpsApi
      ? [
          { label: 'Perps markets', href: perpsApi.markets },
          { label: 'Perps engine stats', href: perpsApi.stats },
          { label: 'Perps engine info', href: perpsApi.info },
        ]
      : []),
  ]
  const explorer: SourceLink[] = [
    { label: 'Arch Explorer', href: meta.explorer_url },
    ...(tokens
      ? [
          { label: 'aUSD token', href: explorerLink(meta, 'tokens', tokens.ausd_mint) },
          { label: 'aBTC token', href: explorerLink(meta, 'tokens', tokens.abtc_mint) },
        ]
      : []),
    ...(perps
      ? [
          { label: 'Perps program', href: explorerLink(meta, 'programs', perps.program) },
          { label: 'Perps exchange account', href: explorerLink(meta, 'accounts', perps.exchange) },
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
    ...(perps
      ? [
          {
            label: 'Perps markets snapshot',
            filename: 'arch-perps-markets.csv',
            rows: perps.markets.map((m) => ({
              symbol: m.symbol,
              class: m.market_class ?? '',
              mark_price_usd: m.mark_price_usd,
              volume_24h_usd: m.volume_24h_usd ?? '',
              open_interest_usd: m.open_interest_usd,
              funding_rate_apr_pct: m.funding_rate_apr_pct,
              max_leverage: m.max_leverage,
            })),
          },
        ]
      : []),
    ...(theya && theya.btc !== null
      ? [
          {
            label: 'Theya BTC holdings',
            filename: 'arch-prime-theya-holdings.csv',
            rows: [
              {
                computed_at: theya.computed_at,
                scan_started_at: theya.scan_started_at ?? '',
                scan_completed_at: theya.scan_completed_at ?? '',
                status: theya.status,
                address_count: theya.address_count ?? '',
                theya_btc: theya.btc_raw ?? theya.btc,
                theya_usd: theya.usd ?? '',
                combined_assets_usd: theya.total_assets_usd ?? '',
              },
            ],
          },
        ]
      : []),
    ...(series.tx_daily
      ? [{ label: 'Daily Arch transactions', filename: 'arch-transactions-daily.csv', rows: series.tx_daily.map((r) => ({ ...r })) }]
      : []),
  ]

  return (
    <Panel
      id="verify"
      title="Verify & Export"
      subtitle="Read every upstream API first-hand, check source freshness, or download CSV snapshots."
    >
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-4">
        <Group title="Sources and their age">
          <SourceAges data={data} />
        </Group>
        <Group title="Arch Prime Analytics API">
          <Links links={analytics} />
        </Group>
        <Group title="Explorer & Snapshot">
          <Links links={[...explorer, { label: 'This page’s data (JSON)', href: SNAPSHOT_URL }]} />
        </Group>
        <Group title="Keep a copy">
          <ul className="space-y-1.5 text-[12.5px]">
            {downloads.map((d) => (
              <li key={d.filename}>
                <button type="button" className="link text-ink-2 hover:text-ink" onClick={() => downloadCsv(d.filename, d.rows)}>
                  {d.label} (CSV)
                </button>
              </li>
            ))}
            <li className="pt-1">
              <a className="link font-medium text-ink" href={href('methodology')}>
                How each figure is defined →
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
      <h4 className="subhead mb-2 text-[12.5px]">{title}</h4>
      {children}
    </div>
  )
}

function Links({ links }: { links: SourceLink[] }) {
  return (
    <ul className="space-y-1.5 text-[12.5px]">
      {links.map(
        (l) =>
          l.href && (
            <li key={l.label}>
              <a className="link text-ink-2 hover:text-ink" href={l.href} target="_blank" rel="noreferrer">
                {l.label}
              </a>
            </li>
          ),
      )}
    </ul>
  )
}
