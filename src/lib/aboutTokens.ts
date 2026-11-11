import type { AbtcBridge, AusdBridge, Bridges } from '../data/snapshot'
import { fmtMoment } from './format'

// What aUSD and aBTC are, in the words the page publishes. The page speaks for
// Arch, so how the bridges work is stated directly, not attributed; a figure
// says where it was read. Two kinds of statement carry a time:
//
// - Settings that change (fee, minimum, pauses, the treasury key, the cap) are
//   read from the chain with each snapshot and listed under the time of that
//   read. When the read failed the list is replaced by a line saying so:
//   nothing is quoted from an earlier read.
// - The supply breakdowns were worked out once from on-chain records. They
//   carry the time of that reading and say they do not track the supply.

/** A paragraph, or a lead-in with a list beneath it. */
export type AboutBlock = string | { lead: string; items: string[] }

const AUSD_RECORDS_AT = '13:33 UTC on 11 November 2026'
const ABTC_RECORDS_AT = '13:21 UTC on 11 November 2026'

const amount = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 6 })

/** One amount, or each distinct amount where the bridge's routes differ. */
const acrossRoutes = (values: number[]) =>
  [...new Set(values)]
    .sort((a, b) => a - b)
    .map(amount)
    .join(' or ')

const settings = (bridges: Bridges | null, items: (b: Bridges) => string[]): AboutBlock =>
  bridges
    ? { lead: `The program’s settings, read from its accounts on Arch at ${fmtMoment(bridges.read_at)}:`, items: items(bridges) }
    : 'The program’s current settings were not read from the chain at the last refresh, so they are left out rather than quoted from an earlier read.'

const pausedLine = (paused: string[], running: string) =>
  paused.length > 0 ? `Paused: ${paused.join(', ')}.` : running

export function aboutAusd(bridges: Bridges | null): AboutBlock[] {
  return [
    'aUSD is a token on Arch issued by the aUSD bridge program. It is minted when USDC is deposited on Ethereum or Base into a wallet held with BitGo, and redeeming it pays USDC back from that wallet.',
    `At ${AUSD_RECORDS_AT}, 26,859.50 aUSD existed. On-chain records show where they came from: 28,217.92 were issued on 15 October 2026 in a one-off reissue to a single wallet, 2,531.52 were minted against USDC deposits, and 516.97 were minted by a treasury key without a USDC deposit. 4,406.92 had been burned. These amounts are rounded to the cent and are as of that time: supply changes daily, so they are not meant to add up to the current supply shown on this page.`,
    'The bridge program lets one designated key mint aUSD without a deposit. The only on-chain limit on that key is the overall supply cap.',
    settings(bridges, (b) => ausdSettings(b.ausd)),
    'Deposits under 10,000 USDC are minted after 3 confirmations on Ethereum or 1 on Base, before finality. Each redemption request is screened and paid in USDC when funds are available, and the aUSD is then burned. One admin key can pause minting and redemption.',
    'There is no published attestation or audit of the USDC held for aUSD. aUSD does not pay yield.',
  ]
}

function ausdSettings(b: AusdBridge): string[] {
  const minimums = b.routes.map((r) => r.min_redemption)
  const fees = b.routes.map((r) => r.redemption_fee)
  const differ = new Set(minimums).size > 1 || new Set(fees).size > 1
  const off = (enabled: (r: AusdBridge['routes'][number]) => boolean, what: string) => {
    const count = b.routes.filter((r) => !enabled(r)).length
    return count > 0 ? [`${what} on ${count} of ${b.routes.length} routes`] : []
  }
  const paused = [
    ...(b.paused.minting ? ['minting'] : []),
    ...(b.paused.redemption_requests ? ['new redemption requests'] : []),
    ...(b.paused.redemption_settlement ? ['settling redemptions'] : []),
    ...off((r) => r.deposits_enabled, 'deposits'),
    ...off((r) => r.redemptions_enabled, 'redemption requests'),
  ]
  return [
    b.treasury_key_set
      ? 'The key that can mint without a deposit is active.'
      : 'No key that can mint without a deposit is set.',
    `The supply cap is ${amount(b.supply_cap)} aUSD.`,
    `Deposits are approved by ${b.signers_required === 1 ? 'a single signer' : `${b.signers_required} signers`}.`,
    `Redemption requests must be at least ${acrossRoutes(minimums)} aUSD, and each is charged ${acrossRoutes(fees)} aUSD` +
      (differ ? ', depending on the route.' : '.'),
    pausedLine(paused, 'Nothing is paused.'),
  ]
}

export function aboutAbtc(bridges: Bridges | null): AboutBlock[] {
  return [
    'aBTC is a token on Arch issued by the BTC bridge program. It is minted after a Bitcoin deposit to a bridge-controlled address reaches three confirmations.',
    `At ${ABTC_RECORDS_AT}, 0.22361591 aBTC existed: 0.22495536 minted across 22 deposits and 0.00133945 burned across 3 withdrawals. On-chain records to that time show a 1,000-sat fee on each direct deposit, and no aBTC minted without a recorded Bitcoin deposit. These figures are as of that time and do not track the supply since.`,
    'The bridge program includes a feature that would allow minting before bitcoin arrives.',
    settings(bridges, (b) => abtcSettings(b.abtc)),
    'One admin key can pause the bridge and transfer the right to mint. There is no published attestation of the bitcoin held.',
  ]
}

function abtcSettings(b: AbtcBridge): string[] {
  const paused = [...(b.paused.deposits ? ['deposits'] : []), ...(b.paused.withdrawals ? ['withdrawals'] : [])]
  return [
    b.treasury_credit_set_up
      ? 'The feature that allows minting before bitcoin arrives has been set up.'
      : 'The feature that allows minting before bitcoin arrives is not set up.',
    `The deposit fee is ${amount(b.deposit_fee_sats)} sats.`,
    pausedLine(paused, 'Deposits and withdrawals are not paused.'),
  ]
}
