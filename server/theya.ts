import type { TheyaCompositionPart, TheyaData, TheyaJobStatus, TheyaStatus } from '../src/data/theya.js'
import type { GetJson } from './http.js'

// Fetches and parses Theya Bitcoin holdings from Arch Prime Analytics'
// `GET /v1/prime-transparency` route. The ingester (`THEYA_WALLETS=1`) scans
// a fixed roster of mainnet Bitcoin addresses every four hours against the
// Arch indexer's mainnet Bitcoin API and publishes `T01` (confirmed BTC),
// `T02` (USD value), `O01`/`O02` (combined assets and 24h change), and the
// `theya` ingestion job status.

export const PRIME_TRANSPARENCY_PATH = '/v1/prime-transparency'

export interface RawPrimeTransparencyField {
  value?: string | number | null
  status?: string
  as_of?: string | null
  notes?: string[]
}

export interface RawPrimeTransparencyIngestion {
  job: string
  status: string
  completed_at?: string | null
  detail?: {
    checked_at?: string
    error?: string
    error_code?: string
  } | null
}

interface RawBaseline {
  kind?: string
  estimated?: boolean
  inputs?: {
    'theya:confirmed'?: { value?: string | number | null; source_at?: string | null }
  }
}

export interface RawPrimeTransparency {
  computed_at?: string | null
  network?: string
  fields?: Record<string, RawPrimeTransparencyField | undefined>
  metadata?: Record<string, unknown>
  ingestion?: RawPrimeTransparencyIngestion[]
}

const VALID_STATUS = new Set<TheyaStatus>(['available', 'stale', 'incomplete', 'unavailable'])

function parseStatus(raw: string | undefined): TheyaStatus {
  return raw && VALID_STATUS.has(raw as TheyaStatus) ? (raw as TheyaStatus) : 'unavailable'
}

function parseNumber(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) ? n : null
}

function parseIntString(raw: string | undefined): number | null {
  if (!raw) return null
  const n = Number(raw.replace(/,/g, ''))
  return Number.isSafeInteger(n) && n >= 0 ? n : null
}

function isoOrNull(raw: string | null | undefined): string | null {
  if (!raw) return null
  const cleaned = raw.replace(/[),.;:]+$/, '')
  return Number.isFinite(Date.parse(cleaned)) ? cleaned : null
}

export interface ParsedScanNote {
  addressCount: number | null
  scanStartedAt: string | null
  scanCompletedAt: string | null
  btcTipStart: number | null
  btcTipEnd: number | null
  unconfirmedOutputs: number | null
}

/** Extracts structured scan metadata from the `T01` note emitted by
 * `arch-prime-analytics`. Every field is optional so wording changes degrade
 * cleanly to null instead of failing the parse. */
export function parseScanNote(notes: string[]): ParsedScanNote {
  const joined = notes.join(' ')
  const addresses = joined.match(/across the roster['’]s\s+([\d,]+)\s+addresses/i)
  const window = joined.match(/read between\s+(\S+)\s+and\s+(\S+)/i)
  const tips = joined.match(/Bitcoin tip\s+([\d,]+)\s+to\s+([\d,]+)/i)
  const unconfirmed = joined.match(/([\d,]+)\s+unconfirmed output\(s\)/i)
  return {
    addressCount: parseIntString(addresses?.[1]),
    scanStartedAt: isoOrNull(window?.[1]),
    scanCompletedAt: isoOrNull(window?.[2]),
    btcTipStart: parseIntString(tips?.[1]),
    btcTipEnd: parseIntString(tips?.[2]),
    unconfirmedOutputs: parseIntString(unconfirmed?.[1]),
  }
}

/** Pure projection from `/v1/prime-transparency` to the dashboard's `TheyaData`
 * contract. No I/O so fixtures can pin every derived figure. */
export function parseTheya(raw: RawPrimeTransparency, sourceUrl: string): TheyaData {
  if (!raw || typeof raw !== 'object' || !raw.fields || typeof raw.fields !== 'object') {
    throw new Error('prime-transparency payload missing fields')
  }

  const fields = raw.fields
  const metadata = raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {}
  const t01 = fields.T01
  const t02 = fields.T02
  const o01 = fields.O01
  const o02 = fields.O02
  const a01 = fields.A01
  const o11 = fields.O11

  const status = parseStatus(t01?.status)
  const rawBtc = parseNumber(t01?.value)
  const rawUsd = parseNumber(t02?.value)

  // A stale zero represents an unread roster rather than an empty one: keep it
  // null so the UI labels it pending instead of printing 0 BTC.
  const unreadStaleZero = status === 'stale' && (rawBtc === null || rawBtc === 0)
  const btc = status === 'unavailable' || unreadStaleZero ? null : rawBtc
  const btcRaw =
    btc !== null && typeof t01?.value === 'string' && t01.value.trim() !== ''
      ? t01.value.trim()
      : btc !== null
        ? String(btc)
        : null
  const usd = status === 'unavailable' || unreadStaleZero ? null : rawUsd

  const btcPriceField = metadata['shared:btc_price'] as RawPrimeTransparencyField | undefined
  const btcPriceUsd = parseNumber(btcPriceField?.value)
  const btcPriceAsOf = isoOrNull(btcPriceField?.as_of)

  const totalAssetsUsd = parseNumber(o01?.value)
  const totalAssetsChange24hPct = parseNumber(o02?.value)

  const baseline = metadata['shared:total_assets_24h_baseline'] as RawBaseline | undefined
  const totalAssetsChange24hEstimated =
    baseline?.kind === 'total_assets_historical_valuation_v1' && baseline.estimated === true
  const rawBtc24hAgo = parseNumber(baseline?.inputs?.['theya:confirmed']?.value)
  const btc24hAgo = rawBtc24hAgo !== null && rawBtc24hAgo > 0 ? rawBtc24hAgo : null
  const btcChange24h = btc !== null && btc24hAgo !== null ? Math.round((btc - btc24hAgo) * 1e8) / 1e8 : null

  const composition = buildComposition(totalAssetsUsd, usd, btc, parseNumber(a01?.value), parseNumber(o11?.value), btcPriceUsd)

  const notes = Array.isArray(t01?.notes) ? t01.notes.filter((n): n is string => typeof n === 'string' && n.trim() !== '') : []
  const noteMeta = parseScanNote(notes)

  const theyaJob = Array.isArray(raw.ingestion) ? raw.ingestion.find((j) => j.job === 'theya') : undefined
  const jobStatus: TheyaJobStatus | null =
    theyaJob?.status === 'success' || theyaJob?.status === 'failed' ? theyaJob.status : null
  const jobError =
    theyaJob?.detail && typeof theyaJob.detail.error === 'string' && theyaJob.detail.error.trim() !== ''
      ? theyaJob.detail.error.trim()
      : theyaJob?.detail && typeof theyaJob.detail.error_code === 'string' && theyaJob.detail.error_code.trim() !== ''
        ? theyaJob.detail.error_code.trim()
        : null

  return {
    status,
    btc,
    btc_raw: btcRaw,
    usd,
    btc_price_usd: btcPriceUsd,
    btc_price_as_of: btcPriceAsOf,
    total_assets_usd: totalAssetsUsd,
    total_assets_change_24h_pct: totalAssetsChange24hPct,
    total_assets_change_24h_estimated: totalAssetsChange24hEstimated,
    composition,
    btc_24h_ago: btc24hAgo,
    btc_change_24h: btcChange24h,
    scan_started_at: isoOrNull(t01?.as_of) ?? noteMeta.scanStartedAt,
    scan_completed_at: isoOrNull(theyaJob?.completed_at) ?? noteMeta.scanCompletedAt,
    address_count: noteMeta.addressCount,
    btc_tip_start: noteMeta.btcTipStart,
    btc_tip_end: noteMeta.btcTipEnd,
    unconfirmed_outputs: noteMeta.unconfirmedOutputs,
    job_status: jobStatus,
    job_error: jobError,
    computed_at: isoOrNull(raw.computed_at),
    notes,
    source_url: sourceUrl,
  }
}

function buildComposition(
  totalAssetsUsd: number | null,
  theyaUsd: number | null,
  theyaBtc: number | null,
  ausdSupply: number | null,
  abtcSupply: number | null,
  btcPriceUsd: number | null,
): TheyaCompositionPart[] {
  if (totalAssetsUsd === null || totalAssetsUsd <= 0) return []
  const abtcUsd = abtcSupply !== null && btcPriceUsd !== null ? abtcSupply * btcPriceUsd : null
  const parts: TheyaCompositionPart[] = [
    { key: 'theya', label: 'Theya BTC', usd: theyaUsd, btc: theyaBtc },
    { key: 'ausd', label: 'aUSD', usd: ausdSupply, btc: null },
    { key: 'abtc', label: 'aBTC', usd: abtcUsd, btc: abtcSupply },
  ]
  const known = parts.reduce((sum, part) => sum + (part.usd ?? 0), 0)
  const otherUsd = Math.max(0, totalAssetsUsd - known)
  parts.push({ key: 'other', label: 'aETH & aHYPE', usd: otherUsd, btc: null })
  return parts
}

export async function fetchTheya(get: GetJson, baseUrl: string): Promise<TheyaData> {
  const sourceUrl = `${baseUrl.replace(/\/+$/, '')}${PRIME_TRANSPARENCY_PATH}`
  const raw = await get<RawPrimeTransparency>(PRIME_TRANSPARENCY_PATH)
  return parseTheya(raw, sourceUrl)
}
