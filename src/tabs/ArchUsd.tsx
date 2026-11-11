import { Bar, CartesianGrid, ComposedChart, Legend, Line, Tooltip, XAxis, YAxis } from 'recharts'
import type { Market, Snapshot, SnapshotMeta, Tokens } from '../data/snapshot'
import AboutToken from '../components/AboutToken'
import ChartBox from '../components/ChartBox'
import HeadlineMetric from '../components/HeadlineMetric'
import PageHeader from '../components/PageHeader'
import Panel from '../components/Panel'
import SourceLine from '../components/SourceLine'
import { axisProps, chartMargin, dayAxis, gridProps, legendProps, lineProps, tooltipProps } from '../lib/chart'
import { aboutAusd } from '../lib/aboutTokens'
import { definitions } from '../lib/definitions'
import { fmtDateShort, fmtNum, fmtPct, fmtToken, fmtUsd, usdColumn } from '../lib/format'
import { analyticsLinks, explorerLink } from '../lib/links'
import { usePageHref } from '../lib/range'
import { colors, productColors } from '../theme'
import Valuation from './archusd/Valuation'

/** aUSD on Arch: supply, the token accounts holding it, how it is valued
 * here, how it moves, and its market in Arch Lend. What it is and who can
 * create it sit in a side panel, opened from beside the title. */
export default function ArchUsd({ data }: { data: Snapshot }) {
  const { tokens, lend, meta, bridges } = data
  const market = tokens ? lend.markets.find((m) => m.mint === tokens.ausd_mint) : undefined

  return (
    <div className="space-y-3">
      <PageHeader
        title="ArchUSD"
        subtitle="aUSD on Arch: how much exists, what it is and who can create it, how it is valued here, and how it is used in Arch Lend"
        action={
          (bridges || meta.degraded.includes('bridges')) && (
            <AboutToken
              id="about-ausd"
              title="About aUSD"
              subtitle="What aUSD is, where its supply came from, and who can create or pause it. Each statement is read from the chain or attributed."
              blocks={aboutAusd(bridges)}
              other={{ label: 'About aBTC', page: 'risk', anchor: 'about-abtc' }}
              links={[
                { label: 'aUSD bridge program', href: bridges && explorerLink(meta, 'programs', bridges.ausd.program) },
                { label: 'aUSD token', href: tokens && explorerLink(meta, 'tokens', tokens.ausd_mint) },
              ]}
            />
          )
        }
      />

      {tokens ? (
        <section className="grid grid-cols-2 gap-x-6 gap-y-6 border-y border-line py-5 lg:grid-cols-4">
          <HeadlineMetric
            label="aUSD supply"
            value={fmtToken(tokens.ausd_supply, 'aUSD')}
            definition={definitions.ausdSupply}
            note="In existence on Arch, from the token’s mint"
          />
          <HeadlineMetric
            label="Token accounts"
            value={fmtNum(tokens.ausd_holders)}
            definition={definitions.tokenAccounts}
            note="Holding a balance. Accounts, not people or wallets."
          />
          <HeadlineMetric
            label="Transfers recorded"
            value={fmtNum(tokens.ausd_transfers_total)}
            definition={definitions.ausdTransfers}
            note={`${fmtToken(tokens.ausd_transfer_volume_total, 'aUSD')} moved to date, per the Arch Explorer`}
          />
          <HeadlineMetric
            label="Supplied to Arch Lend"
            value={market?.supplied_usd != null ? fmtUsd(market.supplied_usd) : '—'}
            note={market?.borrowed_usd != null && `${fmtUsd(market.borrowed_usd)} of it borrowed`}
          />
        </section>
      ) : (
        <div className="card px-4 py-8 text-center text-[13px] text-ink-2">
          aUSD figures come from the Arch Explorer, which did not answer. They return with the next refresh.
        </div>
      )}

      {tokens && (
        <>
          <Valuation market={market} meta={meta} />

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <Transfers tokens={tokens} meta={meta} />
            </div>
            {market && <LendCard market={market} meta={meta} />}
          </div>
        </>
      )}
    </div>
  )
}

function Transfers({ tokens, meta }: { tokens: Tokens; meta: SnapshotMeta }) {
  const rows = tokens.ausd_transfers_daily
  const open = rows[rows.length - 1]?.date === meta.as_of.slice(0, 10)
  return (
    <Panel
      id="transfers"
      title="Transfer activity"
      subtitle={
        'aUSD moved each UTC day and the number of transfers, over the last 30 days at most.' +
        (open ? ' Today’s bar is the day so far.' : '') +
        ' The explorer misses some transfers inside multi-step transactions.'
      }
      definition={definitions.ausdTransfers}
      source={
        <SourceLine
          from="Arch Explorer"
          links={[{ label: 'aUSD on the Arch Explorer', href: explorerLink(meta, 'tokens', tokens.ausd_mint) }]}
          csv={{ filename: 'ausd-transfers-daily.csv', rows: () => rows.map((r) => ({ ...r })) }}
        />
      }
    >
      <ChartBox size="tall">
        <ComposedChart data={rows} margin={chartMargin}>
          <CartesianGrid {...gridProps} />
          <XAxis {...dayAxis(rows, open ? 'Today' : undefined)} />
          <YAxis yAxisId="v" {...axisProps} tickFormatter={(v) => fmtNum(v)} width={56} />
          <YAxis yAxisId="n" orientation="right" {...axisProps} tickFormatter={(v) => fmtNum(v)} width={40} />
          <Tooltip
            {...tooltipProps}
            labelFormatter={fmtDateShort}
            formatter={(v: number, name: string) =>
              name === 'Transfers (right axis)' ? v.toLocaleString('en-US') : fmtToken(v, 'aUSD')
            }
          />
          <Legend {...legendProps} />
          {/* A token's transfers are not a product's: both series are neutral, told apart as bars and a line. */}
          <Bar
            yAxisId="v"
            dataKey="volume"
            name="aUSD moved (left axis)"
            fill={productColors.neutral}
            isAnimationActive={false}
          />
          <Line yAxisId="n" dataKey="transfers" name="Transfers (right axis)" stroke={colors.ink} {...lineProps} />
        </ComposedChart>
      </ChartBox>
    </Panel>
  )
}

function LendCard({ market, meta }: { market: Market; meta: SnapshotMeta }) {
  const href = usePageHref()
  const usd = usdColumn([market.supplied_usd, market.borrowed_usd, market.available_usd])
  const rows: [string, string][] = [
    ['Supplied', market.supplied_usd != null ? usd(market.supplied_usd) : '—'],
    ['Borrowed', market.borrowed_usd != null ? usd(market.borrowed_usd) : '—'],
    ['Available to borrow', market.available_usd != null ? usd(market.available_usd) : '—'],
    ['Utilization', fmtPct(market.utilization_pct)],
    ['Supply APR', fmtPct(market.supply_apr_pct, 2)],
    ['Borrow APR', fmtPct(market.borrow_apr_pct, 2)],
  ]
  return (
    <Panel
      id="lend"
      title="aUSD in Arch Lend"
      subtitle="The aUSD market, now"
      actions={
        <a className="btn" href={href('markets', 'lend')}>
          All markets
        </a>
      }
      source={<SourceLine from="Arch Prime Analytics" links={[{ label: 'Markets (API)', href: analyticsLinks(meta).markets }]} />}
    >
      <dl className="divide-y divide-line text-[13px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-4 py-2">
            <dt className="text-ink-2">{k}</dt>
            <dd className="num text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}
