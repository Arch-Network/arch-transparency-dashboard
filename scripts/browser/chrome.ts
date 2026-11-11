import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// The Chrome already on the machine, headless, driven over the DevTools
// protocol with Node's own WebSocket: no browser download and no test
// framework. Its profile is a temporary directory, removed on close.

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
]

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms))

export interface Browser {
  /** One DevTools protocol command and its result. */
  send: (method: string, params?: object) => Promise<any>
  /** The value of an expression in the page. */
  evaluate: <T>(expression: string) => Promise<T>
  /** Errors and warnings the page wrote to its console, and anything it threw. */
  problems: string[]
  close: () => void
}

export async function launch(): Promise<Browser> {
  const binary = CANDIDATES.find((path) => path && existsSync(path))
  if (!binary) throw new Error('No Chrome found. Set CHROME_PATH to a Chrome or Chromium binary.')
  const profile = mkdtempSync(join(tmpdir(), 'panel-test-'))
  // Port 0 has Chrome choose a free one, which it writes into its profile.
  const flags = ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`]
  const chrome = spawn(binary, [...flags, 'about:blank'], { stdio: 'ignore' })
  const quit = () => {
    chrome.kill()
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
  try {
    const portFile = join(profile, 'DevToolsActivePort')
    for (let i = 0; i < 80 && !existsSync(portFile); i++) await sleep(250)
    const port = readFileSync(portFile, 'utf8').split('\n')[0]
    const targets = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()) as { type: string; webSocketDebuggerUrl: string }[]
    const socket = new WebSocket(targets.find((t) => t.type === 'page')!.webSocketDebuggerUrl)
    await new Promise((done, fail) => {
      socket.onopen = done
      socket.onerror = fail
    })

    let last = 0
    const waiting = new Map<number, (result: any) => void>()
    const problems: string[] = []
    socket.onmessage = (event) => {
      const message = JSON.parse(String(event.data))
      if (message.id) {
        waiting.get(message.id)?.(message.result)
        waiting.delete(message.id)
      } else if (message.method === 'Runtime.exceptionThrown') {
        problems.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text)
      } else if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) {
        problems.push(message.params.args.map((a: { value?: unknown; description?: string }) => a.value ?? a.description).join(' '))
      }
    }
    const send = (method: string, params: object = {}) =>
      new Promise<any>((done) => {
        waiting.set(++last, done)
        socket.send(JSON.stringify({ id: last, method, params }))
      })
    await send('Runtime.enable')
    await send('Page.enable')
    const evaluate = async <T>(expression: string) =>
      (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value as T
    return {
      send,
      evaluate,
      problems,
      close: () => {
        socket.close()
        quit()
      },
    }
  } catch (err) {
    quit()
    throw err
  }
}
