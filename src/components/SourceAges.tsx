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
  const at = (iso: string) => `${fmtClock(iso)} (${fmtSpan(Date.parse(meta.as_of) - Date.parse(iso))} earlier)`
  const number = (n: number) => n.toLocaleString('en-US')
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
    ...(data.perps || meta.degraded.includes('perps')
      ? [
          {
            source: 'Arch Perps Engine',
            state: data.perps
              ? `Read ${fmtTs(data.perps.read_at)} · batch #${number(data.perps.settle_seq)}`
              : 'Did not answer: perpetuals figures are left out',
            detail: data.perps
              ? `${number(data.perps.markets_priced)}/${number(data.perps.markets_total)} markets priced · ` +
                `${number(data.perps.markets_quoted)} quoted` +
                (data.perps.build_sha ? ` · build ${data.perps.build_sha.slice(0, 7)}` : '')
              : undefined,
          },
        ]
      : []),
    ...(data.theya || meta.degraded.includes('theya')
      ? [
          {
            source: 'Theya Bitcoin roster',
            state: !data.theya
              ? 'Did not answer: Theya holdings are left out'
              : data.theya.scan_started_at
                ? `Last complete scan began ${at(data.theya.scan_started_at)}`
                : 'No complete roster scan stored yet',
            detail: data.theya
              ? [
                  data.theya.address_count !== null ? `${number(data.theya.address_count)} mainnet BTC addresses` : null,
                  data.theya.job_status === 'failed' ? 'latest scan attempt failed' : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || undefined
              : undefined,
          },
        ]
      : []),
    ...(coinbase.size > 0
      ? [
          {
            source: 'Coinbase prices',
            state: [...coinbase]
              .map(([hour, symbols]) =>
                symbols.length > 4
                  ? `${symbols.length} tokens: hour from ${fmtClock(hour)}`
                  : `${fmtList(symbols)}: hour from ${fmtClock(hour)}`,
              )
              .join('; '),
            detail: 'The running close of that hour’s candle, for each token',
          },
        ]
      : []),
  ]

  return (
    <dl className="divide-y divide-line text-[12px]">
      {rows.map((r) => (
        <div key={r.source} className="py-1.5 first:pt-0 last:pb-0">
          <dt className="text-[11px] font-medium text-ink-3">{r.source}</dt>
          <dd className="num mt-0.5 text-[12.5px] font-medium text-ink">{r.state}</dd>
          {r.detail && <dd className="num mt-0.5 text-[11.5px] text-ink-2">{r.detail}</dd>}
        </div>
      ))}
    </dl>
  )
}
