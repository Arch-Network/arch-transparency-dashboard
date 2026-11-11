import type { Snapshot } from '../data/snapshot'
import { fmtClock, fmtSpan, fmtTs } from '../lib/format'

/** How old each source's data was when this snapshot was assembled, and
 * which build served it. */
export default function SourceAges({ data }: { data: Snapshot }) {
  const { meta, chain } = data
  /** A time, and how long before the snapshot's assembly it was. */
  const at = (iso: string) => `${fmtClock(iso)} (${fmtSpan(Date.parse(meta.as_of) - Date.parse(iso))} earlier)`
  const number = (n: number) => n.toLocaleString('en-US')
  const coinbase = data.lend.markets.find((m) => m.price?.source === 'coinbase')?.price

  const rows: { source: string; state: string; detail?: string }[] = [
    {
      source: 'This page’s data',
      state: `Assembled ${fmtTs(meta.as_of)}`,
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
    ...(coinbase?.as_of
      ? [{ source: 'BTC price', state: `Coinbase BTC-USD, hour from ${fmtClock(coinbase.as_of)}`, detail: 'The running close of that hour’s candle' }]
      : []),
  ]

  return (
    <dl className="space-y-2.5 text-[13px]">
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
