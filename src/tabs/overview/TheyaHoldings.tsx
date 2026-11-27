import type { Snapshot } from '../../data/snapshot'
import type { TheyaCompositionPart, TheyaData } from '../../data/theya'
import HeadlineMetric, { Delta } from '../../components/HeadlineMetric'
import Panel from '../../components/Panel'
import SourceLine from '../../components/SourceLine'
import { fmtNum, fmtPrice, fmtSpan, fmtTs, fmtUsd } from '../../lib/format'
import { theyaDefinitions } from '../../lib/theyaDefinitions'

const PART_COLORS: Record<TheyaCompositionPart['key'], string> = {
  theya: 'var(--ap-series-5)',
  ausd: 'var(--ap-series-1)',
  abtc: 'var(--ap-series-2)',
  other: 'var(--ap-series-3)',
}

function fmtBtc(n: number, digits = 4): string {
  return (
    n.toLocaleString('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }) + ' BTC'
  )
}

function fmtBtcDelta(n: number): string {
  const abs = Math.abs(n)
  const digits = abs < 0.01 ? 6 : 4
  const rounded = abs.toFixed(digits)
  if (Number(rounded) === 0) return '0 BTC'
  return `${n > 0 ? '+' : '−'}${Number(rounded).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} BTC`
}

function fmtShare(fraction: number): string {
  if (fraction > 0 && fraction < 0.001) return '<0.1%'
  return `${(fraction * 100).toFixed(1)}%`
}

function scanSummary(theya: TheyaData): { value: string; note: string } {
  if (!theya.scan_started_at) {
    return { value: '—', note: 'No complete roster scan stored yet' }
  }
  const bits: string[] = []
  if (theya.scan_completed_at) {
    const durationMs = Date.parse(theya.scan_completed_at) - Date.parse(theya.scan_started_at)
    if (Number.isFinite(durationMs) && durationMs > 0) bits.push(`ran ${fmtSpan(durationMs)}`)
  }
  if (theya.btc_tip_start !== null && theya.btc_tip_end !== null) {
    bits.push(
      theya.btc_tip_start === theya.btc_tip_end
        ? `BTC block ${theya.btc_tip_start.toLocaleString('en-US')}`
        : `BTC blocks ${theya.btc_tip_start.toLocaleString('en-US')}–${theya.btc_tip_end.toLocaleString('en-US')}`,
    )
  }
  if (theya.unconfirmed_outputs !== null) {
    bits.push(`${fmtNum(theya.unconfirmed_outputs)} unconfirmed UTXO${theya.unconfirmed_outputs === 1 ? '' : 's'} excluded`)
  }
  return {
    value: fmtTs(theya.scan_started_at),
    note: bits.length > 0 ? bits.join(' · ') : 'Confirmed unspent outputs only',
  }
}

function CompositionBars({ theya }: { theya: TheyaData }) {
  const total = theya.total_assets_usd
  if (total === null || total <= 0 || theya.composition.length === 0) return null

  const theyaUsd = theya.composition.find((p) => p.key === 'theya')?.usd ?? 0
  const nonTheyaParts = theya.composition.filter((p) => p.key !== 'theya' && p.usd !== null && p.usd > 0)
  const nonTheyaTotal = nonTheyaParts.reduce((sum, p) => sum + (p.usd ?? 0), 0)

  return (
    <div className="mt-5 space-y-3 border-t border-line pt-4">
      <div>
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-xs text-ink-2">
          <span className="subhead text-ink">Tracked asset mix</span>
          <span className="num">Combined total {fmtUsd(total)}</span>
        </div>
        <div
          className="flex h-2.5 w-full overflow-hidden rounded-[3px] bg-soft"
          role="img"
          aria-label={theya.composition
            .filter((p) => p.usd !== null && p.usd > 0)
            .map((p) => `${p.label} ${fmtUsd(p.usd!)}`)
            .join(', ')}
        >
          {theya.composition
            .filter((p) => p.usd !== null && p.usd > 0)
            .map((p) => (
              <div
                key={p.key}
                style={{ flexGrow: p.usd! / total, background: PART_COLORS[p.key] }}
                title={`${p.label}: ${fmtUsd(p.usd!)} (${fmtShare(p.usd! / total)})`}
              />
            ))}
        </div>
      </div>

      {nonTheyaTotal > 0 && theyaUsd > 0 && (
        <div>
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-xs text-ink-2">
            <span>Everything except Theya BTC</span>
            <span className="num">{fmtUsd(nonTheyaTotal)}</span>
          </div>
          <div
            className="flex h-2 w-full overflow-hidden rounded-[3px] bg-soft"
            role="img"
            aria-label={`Everything except Theya BTC: ${nonTheyaParts
              .map((p) => `${p.label} ${fmtShare(p.usd! / nonTheyaTotal)}`)
              .join(', ')}`}
          >
            {nonTheyaParts.map((p) => (
              <div
                key={p.key}
                style={{ flexGrow: p.usd! / nonTheyaTotal, background: PART_COLORS[p.key] }}
                title={`${p.label}: ${fmtUsd(p.usd!)} (${fmtShare(p.usd! / nonTheyaTotal)} of non-Theya assets)`}
              />
            ))}
          </div>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 pt-1 text-[13px] sm:grid-cols-4">
        {theya.composition.map((part) => {
          const share = part.usd !== null ? part.usd / total : null
          const restShare =
            part.key !== 'theya' && part.usd !== null && nonTheyaTotal > 0 ? part.usd / nonTheyaTotal : null
          return (
            <div key={part.key} className="min-w-0">
              <dt className="flex items-center gap-2 text-xs text-ink-2">
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-[2px]"
                  style={{ background: PART_COLORS[part.key] }}
                />
                {part.label}
              </dt>
              <dd className="num mt-0.5 font-medium text-ink">
                {part.usd === null ? 'Scan pending' : fmtUsd(part.usd)}
              </dd>
              <dd className="num text-xs text-ink-2">
                {part.usd === null
                  ? 'Awaiting complete roster scan'
                  : [
                      restShare !== null
                        ? `${fmtShare(restShare)} of non-Theya`
                        : share !== null
                          ? `${fmtShare(share)} of total`
                          : null,
                      part.btc !== null ? fmtBtc(part.btc, 4) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}

/** Confirmed Bitcoin held across the tracked Theya wallet roster, read from
 * Arch Prime Analytics' `/v1/prime-transparency` endpoint. Shown separately
 * from Arch Prime protocol TVL so protocol liquidity and external BTC custody
 * are never conflated. */
export default function TheyaHoldings({ data }: { data: Snapshot }) {
  const { theya, meta } = data
  const degraded = meta.degraded.includes('theya')

  if (!theya && !degraded) return null

  if (!theya) {
    return (
      <Panel
        id="theya"
        title="Theya Bitcoin holdings"
        subtitle="Confirmed BTC across the tracked Theya mainnet roster, read via Arch Prime Analytics"
        definition={theyaDefinitions.theyaHoldings}
      >
        <p className="text-[13px] text-ink-2">
          The Theya roster feed did not answer at the last refresh, so these figures are left out rather than shown as
          zero. They will return on the next refresh.
        </p>
      </Panel>
    )
  }

  const scan = scanSummary(theya)
  const chip =
    theya.status === 'available' && theya.job_status !== 'failed'
      ? theya.address_count !== null
        ? `${theya.address_count.toLocaleString('en-US')} BTC addresses`
        : 'Bitcoin mainnet'
      : theya.status === 'stale'
        ? 'Stale scan'
        : theya.status === 'unavailable'
          ? 'Unavailable'
          : 'Scan warning'

  const showWarning =
    theya.status === 'stale' || theya.status === 'unavailable' || theya.job_status === 'failed'

  return (
    <Panel
      id="theya"
      title="Theya Bitcoin holdings"
      subtitle="Confirmed unspent Bitcoin across the tracked Theya mainnet roster, reported separately from Arch Prime protocol TVL."
      definition={theyaDefinitions.theyaHoldings}
      chip={chip}
      source={
        <SourceLine
          from="Arch Prime Analytics (Theya roster scan)"
          links={[{ label: 'Prime transparency (API)', href: theya.source_url }]}
          definition={theyaDefinitions.theyaHoldings}
          csv={
            theya.btc !== null
              ? {
                  filename: 'arch-prime-theya-holdings.csv',
                  rows: () => [
                    {
                      computed_at: theya.computed_at,
                      scan_started_at: theya.scan_started_at,
                      scan_completed_at: theya.scan_completed_at,
                      status: theya.status,
                      address_count: theya.address_count,
                      btc_tip_start: theya.btc_tip_start,
                      btc_tip_end: theya.btc_tip_end,
                      unconfirmed_outputs: theya.unconfirmed_outputs,
                      theya_btc: theya.btc_raw ?? theya.btc,
                      theya_btc_24h_ago: theya.btc_24h_ago,
                      theya_btc_change_24h: theya.btc_change_24h,
                      theya_usd: theya.usd,
                      btc_price_usd: theya.btc_price_usd,
                      combined_assets_usd: theya.total_assets_usd,
                      combined_assets_change_24h_pct: theya.total_assets_change_24h_pct,
                    },
                  ],
                }
              : undefined
          }
        />
      }
    >
      {showWarning && (
        <p className="note mb-4">
          {theya.status === 'unavailable'
            ? theya.notes[0] ?? 'No complete Theya roster scan is stored yet.'
            : theya.job_status === 'failed'
              ? `The latest Theya roster scan attempt failed${theya.job_error ? ` (${theya.job_error})` : ''}. The last complete scan is shown below with its original timestamp.`
              : theya.btc === null
                ? 'The Theya roster scan is pending or stale; no confirmed balance is shown until a complete scan succeeds.'
                : 'The stored Theya roster scan is past its normal freshness window. The timestamp below reflects when that scan began.'}
        </p>
      )}

      <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
        <HeadlineMetric
          size="figure"
          label="Confirmed Theya BTC"
          value={theya.btc !== null ? fmtBtc(theya.btc, 4) : theya.status === 'stale' ? 'Scan pending' : '—'}
          definition={theyaDefinitions.theyaHoldings}
          comparison={
            theya.btc_change_24h !== null ? (
              <span title={theya.btc_raw ? `Exact: ${theya.btc_raw} BTC` : undefined}>
                {fmtBtcDelta(theya.btc_change_24h)} vs 24 hours ago
              </span>
            ) : undefined
          }
          note={
            theya.btc_raw
              ? `Exact ${theya.btc_raw} BTC` +
                (theya.address_count !== null ? ` across ${theya.address_count.toLocaleString('en-US')} addresses` : '')
              : 'No confirmed scan balance available'
          }
        />
        <HeadlineMetric
          size="figure"
          label="Theya BTC value"
          value={theya.usd !== null ? fmtUsd(theya.usd) : '—'}
          note={
            theya.btc_price_usd !== null
              ? `Valued at ${fmtPrice(theya.btc_price_usd)} / BTC` +
                (theya.btc_price_as_of ? ` (hour from ${fmtTs(theya.btc_price_as_of)})` : '')
              : 'Awaiting BTC reference price'
          }
        />
        <HeadlineMetric
          size="figure"
          label="Combined assets on Arch"
          value={theya.total_assets_usd !== null ? fmtUsd(theya.total_assets_usd) : '—'}
          definition={theyaDefinitions.combinedAssets}
          comparison={
            theya.total_assets_change_24h_pct !== null ? (
              <>
                <Delta pct={theya.total_assets_change_24h_pct} /> vs 24 hours ago
                {theya.total_assets_change_24h_estimated ? ' · estimated' : ''}
              </>
            ) : undefined
          }
          note="aUSD, aBTC, Theya BTC and other bridged assets"
        />
        <HeadlineMetric size="figure" label="Last complete scan" value={scan.value} note={scan.note} />
      </div>

      <CompositionBars theya={theya} />

      <p className="mt-4 text-xs text-ink-2">
        Scanned every four hours across a fixed mainnet Bitcoin roster via the Arch indexer’s Bitcoin API. Unconfirmed
        outputs are excluded, and whether these addresses also back aBTC is not established.
      </p>
    </Panel>
  )
}
