import type { AbtcBridge, AusdBridge, BridgeRoute, Bridges } from '../src/data/snapshot.js'
import { readAccounts, type ChainAccount } from './archRpc.js'
import type { Config } from './config.js'

// The settings of the two bridges that issue aUSD and aBTC, decoded from the
// programs' own accounts on Arch. They change without notice (the redemption
// fee changed five times in one week), so the page reads them rather than
// quoting them.
//
// Every account is checked before it is believed: its owner, its type tag,
// and the mint or route it says it is for. A layout this file does not know
// fails the read, and the page says the settings were not read.

const AUSD_PROGRAM = 'd14535a471647c7246c9ff0d79097ebef3f914b9dce2bf6cee428893b2b5c98b'
const BTC_PROGRAM = '85b49cefeec08506ef9bf0a641abe5a0d85fe584a380eb66442a3f6fe1f8ca11'

/** The accounts read, in the order `decodeBridges` takes them. Each is the
 * program's derived address for the seeds named. */
export const BRIDGE_ACCOUNTS = [
  /** aUSD bridge, `config`. */
  '1f4cd897337ebfde47acd149cb997e1bf7ca60c5962a8676081abd5df0e70c3d',
  /** aUSD bridge, `asset` + the aUSD mint. */
  '49e4c5ddfe12b7c2278969a02cf05b85e7cf04f05674f2fdea0c8d5f00514331',
  /** aUSD bridge, `route` + 1 and `route` + 2: aUSD's two routes. */
  'e6464fc06398a63c547cae980860136923bdead96c660b77b0143ac34045d832',
  '903dbce31aaf013c934d108ba54fd10d8e5f91707a48d0dffc76b97729e7eedd',
  /** BTC bridge, `bridge` + the aBTC mint + its first admin. */
  '1d80ef4da77f450b989f85e084cc53e98de065deaabc7cd210166b1a068e0650',
  /** BTC bridge, `treasury-credit` + the bridge account above. Absent unless
   * the mint-before-deposit feature has been set up. */
  'f5fa942415db5b90c62c97aa02ed8df198b6faef02827b8fcc9e77278dc5cbd5',
]

export async function fetchBridges(rpcUrl: string, cfg: Config, now: Date): Promise<Bridges> {
  return decodeBridges(await readAccounts(rpcUrl, BRIDGE_ACCOUNTS), cfg, now)
}

export function decodeBridges(accounts: (ChainAccount | null)[], cfg: Config, now: Date): Bridges {
  const [config, assetAccount, route1, route2, btcConfig, treasuryCredit] = accounts
  const asset = ausdAsset(owned(assetAccount, AUSD_PROGRAM), cfg.ausdMint)
  const unit = 10 ** asset.decimals
  return {
    read_at: now.toISOString(),
    ausd: {
      program: AUSD_PROGRAM,
      ...ausdConfig(owned(config, AUSD_PROGRAM)),
      supply_cap: asset.supply_cap_atoms / unit,
      treasury_key_set: asset.treasury_key_set,
      routes: [route1, route2].map((route, i) => ausdRoute(owned(route, AUSD_PROGRAM), i + 1, cfg.ausdMint, unit)),
    },
    abtc: {
      program: BTC_PROGRAM,
      ...btcBridge(owned(btcConfig, BTC_PROGRAM), cfg.abtcMint),
      treasury_credit_set_up: treasuryCredit !== null,
    },
  }
}

/** The account's data, once it is known to exist and belong to the program. */
function owned(account: ChainAccount | null | undefined, program: string): Reader {
  if (!account) throw new Error('bridge: an account that must exist was not found')
  if (account.owner !== program) throw new Error(`bridge: account owned by ${account.owner}, not ${program}`)
  return new Reader(account.data)
}

/** Reads fixed-width little-endian fields in order. Reading past the end throws. */
class Reader {
  private at = 0
  constructor(private readonly data: Buffer) {}
  u8 = (): number => this.data.readUInt8(this.step(1))
  u32 = (): number => this.data.readUInt32LE(this.step(4))
  /** Amounts here are far below 2^53 base units, so a number holds them exactly. */
  u64 = (): number => Number(this.data.readBigUInt64LE(this.step(8)))
  bool = (): boolean => this.u8() !== 0
  key = (): string => this.data.subarray(this.step(32), this.at).toString('hex')
  ascii = (length: number): string => this.data.subarray(this.step(length), this.at).toString('latin1')
  skip = (bytes: number): void => void this.step(bytes)
  private step(bytes: number): number {
    const start = this.at
    this.at += bytes
    return start
  }
}

function expect(what: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`bridge: ${what} is ${String(actual)}, expected ${String(expected)}`)
}

const KEY = 32
const ATTESTERS = 8 * 20

/** aUSD bridge `Config`, tag 7. */
function ausdConfig(r: Reader): Pick<AusdBridge, 'signers_required' | 'paused'> {
  expect('aUSD config tag', r.u8(), 7)
  r.skip(1 + KEY) // bump, admin
  if (r.bool()) r.skip(KEY) // pending admin, where one is set
  r.skip(KEY + KEY) // pause authority, bridge authority
  const signers_required = r.u8()
  r.skip(1 + ATTESTERS) // signer count, signer registry
  const flags = r.u8()
  expect('aUSD pause flags beyond the three known', flags >> 3, 0)
  const set = (bit: number) => (flags & bit) !== 0
  return {
    signers_required,
    paused: { minting: set(1), redemption_requests: set(2), redemption_settlement: set(4) },
  }
}

/** aUSD bridge `AssetConfig`, tag 11. */
function ausdAsset(r: Reader, mint: string): { decimals: number; supply_cap_atoms: number; treasury_key_set: boolean } {
  expect('aUSD asset tag', r.u8(), 11)
  r.skip(1) // bump
  expect('aUSD asset mint', r.key(), mint)
  const decimals = r.u8()
  r.skip(1) // mint authority bump
  return { decimals, supply_cap_atoms: r.u64(), treasury_key_set: r.bool() }
}

/** aUSD bridge `RouteConfig`, tag 10. */
function ausdRoute(r: Reader, id: number, mint: string, unit: number): BridgeRoute {
  expect('aUSD route tag', r.u8(), 10)
  r.skip(1) // bump
  expect('aUSD route id', r.u32(), id)
  expect(`aUSD route ${id} mint`, r.key(), mint)
  r.skip(KEY + 1 + 1) // source asset, source decimals, destination length
  return {
    id,
    min_redemption: r.u64() / unit,
    redemption_fee: r.u64() / unit,
    deposits_enabled: r.bool(),
    redemptions_enabled: r.bool(),
  }
}

/** BTC bridge config, tag `BRIDGECF`, layout version 1. */
function btcBridge(r: Reader, mint: string): Pick<AbtcBridge, 'deposit_fee_sats' | 'paused'> {
  expect('BTC bridge tag', r.ascii(8), 'BRIDGECF')
  expect('BTC bridge layout version', r.u8(), 1)
  r.skip(1 + KEY + KEY) // bump, first admin, admin
  expect('BTC bridge mint', r.key(), mint)
  r.skip(KEY + 16 * KEY + 1) // custody, operator registry, operator count
  const deposit_fee_sats = r.u64()
  r.skip(8 + 4 * 8 + 2 * 2) // miner fee ceiling, deposit and withdrawal limits
  return { deposit_fee_sats, paused: { deposits: r.bool(), withdrawals: r.bool() } }
}
