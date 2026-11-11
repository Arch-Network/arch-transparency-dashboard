// The Arch RPC: account reads, several in one batched JSON-RPC request, so a
// snapshot costs the node one request however many accounts it reads.

const TIMEOUT_MS = 10_000
/** The node's answer for an address with no account. */
const NOT_FOUND = 404

export interface ChainAccount {
  /** The owning program's address (hex). */
  owner: string
  data: Buffer
}

interface RpcAnswer {
  id: number
  result?: { owner: number[]; data: number[] }
  error?: { code: number; message: string }
}

/** Reads accounts by address (hex), answered in the order asked. An address
 * with no account reads as null; any other failure rejects. */
export async function readAccounts(rpcUrl: string, addresses: string[]): Promise<(ChainAccount | null)[]> {
  const body = addresses.map((address, id) => ({
    jsonrpc: '2.0',
    id,
    method: 'read_account_info',
    params: [...Buffer.from(address, 'hex')],
  }))
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`${rpcUrl} answered ${res.status}`)
  const answers = (await res.json()) as RpcAnswer[]
  return addresses.map((address, id) => {
    const answer = answers.find((a) => a.id === id)
    if (answer?.result) return { owner: Buffer.from(answer.result.owner).toString('hex'), data: Buffer.from(answer.result.data) }
    if (answer?.error?.code === NOT_FOUND) return null
    throw new Error(`${rpcUrl} did not read ${address}: ${answer?.error?.message ?? 'no answer'}`)
  })
}
