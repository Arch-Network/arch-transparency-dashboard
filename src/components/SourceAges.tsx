import type { Snapshot } from '../data/snapshot'
import { fmtClock, fmtList, fmtSpan, fmtTs } from '../lib/format'

interface Props {
  data: Snapshot
  /** How long ago the snapshot was assembled, where a running clock is at hand to say. */
  ago?: string
}

/** How old each source's data was when this snapshot was assembled, and
 * which build served it. */
export default function SourceAges({ data, ago }: Props) {
  const { meta, chain } = data
  /** A time, and how long before the snapshot's assembly it was. */
  const at = (iso: string) => `${fmtClock(iso)} (${fmtSpan(Date.parse(meta.as_of) - Date.parse(iso))} earlier)`
  const number = (n: number) => n.toLocaleString('en-US')
  /** The markets priced from Coinbase, by the hour their price belongs to. */
  const coinbase = new Map<string, string[]>()
  for (const { symbol, price } of data.lend.markets)
    if (price?.source === 'coinbase' && price.as_of) coinbase.set(price.as_of, [...(coinbase.get(price.as_of) ?? []), symbol])

  const rows: { source: string; state: string; detail?: string }[] = [
    {
      source: 'This page’s data',
      state: `Assembled ${fmtTs(meta.as_of)}${ago ? ` (${ago})` : ''}`,
      detail: `Refreshes every ${meta.refresh_seconds} s · ${meta.network}`,
    },
    {
      source: 'Arch Prime Analytics',
      state: meta.analytics_synced_at
        ? `In step with the chain as of ${at(meta.analytics_synced_at)}`
        : 'Reports no sync time',
      detail:
        `Build ${meta.analytics_version} · data revision ${meta.data_revision}` +
        (meta.analytics_replaying ? ' · rebuilding part of its history' : ''),
    },
    {
      source: 'Arch Explorer',
      state: !chain
        ? 'Did not answer: chain and token figures are left out'
        : meta.explorer_indexed_at
          ? `Latest block indexed ${at(meta.explorer_indexed_at)}`
          : 'Reports no indexing time',
      detail: chain
        ? `Arch block ${number(chain.arch_block)}` +
          (chain.btc_tip_block !== null ? ` · Bitcoin tip ${number(chain.btc_tip_block)}` : '')
        : undefined,
    },
    ...(data.bridges || meta.degraded.includes('bridges')
      ? [
          {
            source: 'Arch RPC',
            state: data.bridges
              ? `Bridge settings read ${fmtTs(data.bridges.read_at)}`
              : 'Did not answer: the bridges’ settings are left out',
            detail: 'The aUSD and BTC bridge programs’ own accounts',
          },
        ]
      : []),
    ...(coinbase.size > 0
      ? [
          {
            source: 'Coinbase prices',
            state: [...coinbase].map(([hour, symbols]) => `${fmtList(symbols)}: hour from ${fmtClock(hour)}`).join('; '),
            detail: 'The running close of that hour’s candle, for each token',
          },
        ]
      : []),
  ]

  return (
    <dl className="space-y-3 text-[13px]">
      {rows.map((r) => (
        <div key={r.source}>
          <dt className="text-xs text-ink-2">{r.source}</dt>
          <dd className="num text-ink">{r.state}</dd>
          {r.detail && <dd className="num text-xs text-ink-2">{r.detail}</dd>}
        </div>
      ))}
    </dl>
  )
}
