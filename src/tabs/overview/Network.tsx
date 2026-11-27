import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import type { Chain, ProgramActivity, ProgramId, Snapshot, TxDaily } from '../../data/snapshot'
import ChartBox from '../../components/ChartBox'
import HeadlineMetric from '../../components/HeadlineMetric'
import { DefinitionTip } from '../../components/InfoTooltip'
import Panel from '../../components/Panel'
import SourceLine from '../../components/SourceLine'
import { EmptyState } from '../../components/ui'
import { axisProps, chartMargin, dayAxis, gridProps, tooltipProps } from '../../lib/chart'
import { definitions } from '../../lib/definitions'
import { fmtDateShort, fmtNum, fmtToken } from '../../lib/format'
import { explorerLink } from '../../lib/links'
import { productColors } from '../../theme'

const PROGRAM_NAMES: Record<ProgramId, string> = {
  swap: 'Arch Swap',
  lend: 'Arch Lend',
  vaults: 'Vaults',
  propamm: 'PropAMM',
  perps: 'Arch Perps',
}

/** The Arch chain as a whole, and Arch Prime's programs within it. */
export default function Network({ data }: { data: Snapshot }) {
  const { chain, series, meta } = data
  if (!chain) {
    return (
      <Panel id="network" title="Arch network">
        <EmptyState body="Chain figures come from the Arch Explorer, which did not answer. They return with the next refresh." />
      </Panel>
    )
  }
  return (
    <Panel
      id="network"
      title="Arch network"
      subtitle="The whole Arch chain, every program on it, not Arch Prime alone"
      source={<SourceLine from="Arch Explorer" links={[{ label: 'Arch Explorer', href: meta.explorer_url }]} />}
    >
      <ChainFigures data={data} chain={chain} />
      <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 border-t border-line pt-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {series.tx_daily && <DailyTransactions rows={series.tx_daily} today={meta.as_of.slice(0, 10)} />}
        <Programs data={data} programs={chain.programs} />
      </div>
    </Panel>
  )
}

function ChainFigures({ data, chain }: { data: Snapshot; chain: Chain }) {
  const { tokens, lend, vaults } = data
  const market = tokens && lend.markets.find((m) => m.mint === tokens.abtc_mint)
  const vault = vaults.find((v) => v.asset_symbol === market?.symbol && v.total_assets !== null)
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 xl:grid-cols-6">
      <HeadlineMetric size="figure" label="Transactions, 24 h" value={fmtNum(chain.tx_24h)} />
      <HeadlineMetric size="figure" label="Transactions to date" value={fmtNum(chain.tx_total)} />
      {chain.avg_block_time_ms !== null && (
        <HeadlineMetric
          size="figure"
          label="Average block time"
          value={`${Math.round(chain.avg_block_time_ms)} ms`}
          definition={definitions.blockTime}
        />
      )}
      <HeadlineMetric
        size="figure"
        label="TPS, average / peak minute"
        value={`${chain.tps_24h.toFixed(2)} / ${chain.tps_peak.toFixed(0)}`}
        definition={definitions.tps}
      />
      <HeadlineMetric size="figure" label="Validators" value={String(chain.validators_active)} />
      {tokens && (
        <HeadlineMetric
          size="figure"
          label="aBTC supply"
          value={fmtToken(tokens.abtc_supply, 'aBTC')}
          note={
            <>
              {market && `${fmtToken(market.supplied, 'aBTC')} supplied to Arch Lend`}
              {market && vault && ' · '}
              {vault?.total_assets != null &&
                `${fmtToken(vault.total_assets, 'aBTC')} recorded as ${vault.share_symbol} vault assets`}
            </>
          }
        />
      )}
    </div>
  )
}

function DailyTransactions({ rows, today }: { rows: TxDaily[]; today: string }) {
  const open = rows[rows.length - 1]?.date === today
  return (
    <div className="min-w-0">
      <h4 className="subhead">Daily transactions</h4>
      <p className="mt-0.5 text-[12px] text-ink-3">
        Each UTC day over the last 30 days, whatever range is chosen above{open && '. Today’s bar is the day so far.'}
      </p>
      <div className="mt-3">
        <ChartBox>
          <BarChart data={rows} margin={chartMargin}>
            <CartesianGrid {...gridProps} />
            <XAxis {...dayAxis(rows, open ? 'Today' : undefined)} />
            <YAxis {...axisProps} tickFormatter={(v) => fmtNum(v)} width={56} />
            <Tooltip {...tooltipProps} formatter={(v: number) => v.toLocaleString('en-US')} labelFormatter={fmtDateShort} />
            <Bar
              dataKey="tx_count"
              name="Transactions"
              fill={productColors.neutral}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ChartBox>
      </div>
    </div>
  )
}

function Programs({ data, programs }: { data: Snapshot; programs: ProgramActivity[] }) {
  return (
    <div className="min-w-0">
      <h4 className="subhead info-room">
        Arch Prime programs, 24 h
        <DefinitionTip definition={definitions.programTransactions} />
      </h4>
      <table className="ap-table mt-2">
        <thead>
          <tr>
            <th className="pr-2 text-left">Program</th>
            <th className="pl-2 text-right">Transactions</th>
          </tr>
        </thead>
        <tbody>
          {programs.map((p) => {
            const href = explorerLink(data.meta, 'programs', p.address)
            return (
              <tr key={p.id}>
                <td className="pr-2 font-medium text-ink">
                  {href ? (
                    <a className="link" href={href} target="_blank" rel="noreferrer">
                      {PROGRAM_NAMES[p.id]}
                    </a>
                  ) : (
                    PROGRAM_NAMES[p.id]
                  )}
                </td>
                <td className="num pl-2 text-right font-medium text-ink">
                  {p.tx_24h === null ? '—' : p.tx_24h.toLocaleString('en-US')}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
