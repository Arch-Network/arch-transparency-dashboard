import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { extname, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assemble } from '../server/assemble.js'
import { decodeBridges } from '../server/bridge.js'
import { launch, type Browser } from './browser/chrome.js'
import { ABTC_MINT, AUSD_MINT, bridgeAccounts } from './fixtures/bridgeAccounts.js'
import { analytics, config, explorer, NOW } from './fixtures/world.js'

// The About side panels, used as a reader uses them, in headless Chrome:
// opened by the button, a deep link and the other panel's link; closed by
// Escape, the close control, the button and a press outside; with focus, the
// address, the history and scrolling checked at each step.
//
//   npm run test:panel
//
// That builds the page, then serves `dist/` on 127.0.0.1 with `/api/snapshot`
// answered from the fixture world: no upstream is called. It needs a Chrome or
// Chromium on the machine (CHROME_PATH names one that is not in a usual
// place), which is why it is not part of `npm run check` or of the build.

const DIST = fileURLToPath(new URL('../dist', import.meta.url))
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
const pause = (ms = 450) => new Promise((done) => setTimeout(done, ms))

interface Panel {
  page: string
  heading: string
  id: string
  title: string
}
const AUSD: Panel = { page: 'archusd', heading: 'ArchUSD', id: 'about-ausd', title: 'About aUSD' }
const ABTC: Panel = { page: 'risk', heading: 'Risk', id: 'about-abtc', title: 'About aBTC' }
const BUTTON = `document.querySelector('main button[aria-controls^="about-"]')`
const DIALOG = `document.querySelector('dialog.side-panel')`
const CONTENT = `${DIALOG}.lastElementChild`

/** The built page, and the fixture world as its snapshot. */
function serve() {
  const bridges = decodeBridges(bridgeAccounts, { ...config, ausdMint: AUSD_MINT, abtcMint: ABTC_MINT }, NOW)
  const snapshot = JSON.stringify(assemble(analytics, explorer, bridges, config, NOW))
  return createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname
    if (path === '/api/snapshot') return res.writeHead(200, { 'content-type': 'application/json' }).end(snapshot)
    const file = join(DIST, path === '/' ? 'index.html' : path)
    if (!file.startsWith(DIST + sep) || !existsSync(file)) return res.writeHead(404).end()
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file))
  })
}

/** What the test reads off the page after each step. */
interface State {
  hash: string
  heading: string
  open: boolean
  id: string
  name: string
  expanded: string
  controls: string
  focusInside: boolean
  focusOnButton: boolean
  locked: boolean
  scrollY: number
  entries: number
  /** The open panel's box: left, top, width, height. */
  box: [number, number, number, number]
}

function driver(chrome: Browser, base: string) {
  let loads = 0
  const state = () =>
    chrome.evaluate<State>(`(() => {
      const d = ${DIALOG}, b = ${BUTTON}, r = d.getBoundingClientRect()
      return {
        hash: location.hash, heading: document.querySelector('main h2').textContent, open: d.open, id: d.id,
        name: document.getElementById(d.getAttribute('aria-labelledby')).textContent,
        expanded: b.getAttribute('aria-expanded'), controls: b.getAttribute('aria-controls'),
        focusInside: d.contains(document.activeElement), focusOnButton: document.activeElement === b,
        locked: getComputedStyle(document.documentElement).overflowY === 'hidden',
        scrollY: Math.round(scrollY), entries: history.length, box: [r.x, r.y, r.width, r.height],
      }
    })()`)
  /** The middle of an element, brought into view first where it sits in a scrolling box. */
  const centre = (element: string) =>
    chrome.evaluate<{ x: number; y: number }>(`(() => { const e = ${element}; e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
  const pressAt = async ({ x, y }: { x: number; y: number }) => {
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased'])
      await chrome.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 })
    await pause()
  }
  return {
    state,
    centre,
    pressAt,
    press: async (element: string) => pressAt(await centre(element)),
    key: async (key: 'Escape' | 'Tab', shift = false) => {
      const event = { key, code: key, windowsVirtualKeyCode: key === 'Tab' ? 9 : 27, modifiers: shift ? 8 : 0 }
      await chrome.send('Input.dispatchKeyEvent', { type: 'keyDown', ...event })
      await chrome.send('Input.dispatchKeyEvent', { type: 'keyUp', ...event })
      if (key === 'Escape') await pause()
    },
    /** A fresh load of an address: a new query each time, so it is never a same-document change. */
    load: async (hash: string) => {
      await chrome.send('Page.navigate', { url: `${base}/?load=${++loads}#${hash}` })
      for (let i = 0; i < 40 && !(await chrome.evaluate<boolean>(`!!${BUTTON}`)); i++) await pause(250)
      await pause()
    },
    history: async (step: 'back' | 'forward') => {
      await chrome.evaluate(`history.${step}()`)
      await pause()
    },
    scroll: async (at: { x: number; y: number }, touch: boolean) => {
      await chrome.send('Input.synthesizeScrollGesture', { ...at, yDistance: -400, speed: 4000, gestureSourceType: touch ? 'touch' : 'mouse' })
      await pause(250)
    },
  }
}

function isOpen(s: State, panel: Panel, how: string) {
  assert.ok(s.open && s.id === panel.id, `${how}: ${panel.title} is open`)
  assert.equal(s.heading, panel.heading, `${how}: on its page`)
  assert.equal(s.hash, `#${panel.page}/${panel.id}`, `${how}: the address names the panel`)
  assert.equal(s.name, panel.title, `${how}: the dialog is labelled by its title`)
  assert.ok(s.focusInside, `${how}: focus is inside the panel`)
  assert.deepEqual([s.expanded, s.controls], ['true', panel.id], `${how}: the button says expanded, and what it controls`)
  assert.ok(s.locked, `${how}: the page behind does not scroll`)
}

function isClosed(s: State, panel: Panel, how: string) {
  assert.ok(!s.open, `${how}: the panel is closed`)
  assert.equal(s.hash, `#${panel.page}`, `${how}: the address is the plain page`)
  assert.ok(s.focusOnButton, `${how}: focus is back on the button`)
  assert.equal(s.expanded, 'false', `${how}: the button says collapsed`)
  assert.ok(!s.locked, `${how}: the page scrolls again`)
}

/** One panel at one width, through every way in and out of it. */
async function run(chrome: Browser, base: string, panel: Panel, other: Panel, width: number) {
  const phone = width < 640
  const height = 640
  const page = driver(chrome, base)
  await chrome.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: phone })
  const close = `${DIALOG}.querySelector('button[aria-label="Close"]')`
  const scrim = phone ? { x: width / 2, y: 20 } : { x: 60, y: height / 2 }

  await page.load(panel.page)
  let s = await page.state()
  assert.ok(!s.open && s.expanded === 'false', 'the page opens with the panel closed')

  // The button opens it; Tab stays inside, both ways round.
  const button = await page.centre(BUTTON)
  await page.pressAt(button)
  s = await page.state()
  isOpen(s, panel, 'button')
  const entries = s.entries
  const stops = await chrome.evaluate<number>(`${DIALOG}.querySelectorAll('a[href], button').length`)
  for (const shift of [false, true])
    for (let i = 0; i <= stops; i++) {
      await page.key('Tab', shift)
      assert.ok((await page.state()).focusInside, `Tab ${shift ? 'backward' : 'forward'} keeps focus inside the panel`)
    }

  // Escape steps back out of the entry the button added; Forward reopens it, Back closes it.
  await page.key('Escape')
  s = await page.state()
  isClosed(s, panel, 'Escape')
  assert.equal(s.entries, entries, 'Escape: the history did not grow')
  await page.history('forward')
  isOpen(await page.state(), panel, 'Forward')
  await page.history('back')
  isClosed(await page.state(), panel, 'Back')

  await page.press(BUTTON)
  await page.press(close)
  isClosed(await page.state(), panel, 'close control')

  await page.press(BUTTON)
  await page.pressAt(scrim)
  isClosed(await page.state(), panel, 'press outside')

  // The button again. On a phone the sheet covers it, so there is nothing to press.
  if (!phone) {
    await page.press(BUTTON)
    await page.pressAt(button)
    isClosed(await page.state(), panel, 'button again')
  }

  // The page behind stays where it is; the panel's own content scrolls.
  await chrome.evaluate(`window.scrollTo(0, 300)`)
  await chrome.evaluate(`${BUTTON}.click()`)
  await pause()
  const before = (await page.state()).scrollY
  assert.ok(before > 0, 'the page was scrolled before the panel opened')
  await page.scroll(scrim, phone)
  const [x, y, w, h] = (await page.state()).box
  await page.scroll({ x: x + w / 2, y: y + h / 2 }, phone)
  const content = await chrome.evaluate<{ top: number; height: number; full: number }>(`(() => { const e = ${CONTENT}; return { top: e.scrollTop, height: e.clientHeight, full: e.scrollHeight } })()`)
  assert.ok(content.full > content.height && content.top > 0, 'the panel’s content scrolls inside it')
  assert.equal((await page.state()).scrollY, before, 'the page behind did not scroll')
  await page.key('Escape')
  s = await page.state()
  assert.ok(!s.open && s.scrollY === before, 'closing leaves the page where it was')

  // A deep link on a fresh load. Closing rewrites the entry, so a reload stays closed.
  await page.load(`${panel.page}/${panel.id}`)
  s = await page.state()
  isOpen(s, panel, 'deep link')
  await page.key('Escape')
  const closed = await page.state()
  isClosed(closed, panel, 'deep link, Escape')
  assert.equal(closed.entries, s.entries, 'deep link, Escape: the entry was rewritten, not left')
  await chrome.send('Page.reload')
  await pause(1500)
  s = await page.state()
  assert.ok(!s.open && s.hash === `#${panel.page}`, 'a reload after closing stays closed')

  // Across to the other panel, and back.
  await page.press(BUTTON)
  await page.press(`[...${DIALOG}.querySelectorAll('a.btn')].find((a) => a.textContent.trim() === ${JSON.stringify(other.title)})`)
  isOpen(await page.state(), other, 'cross-link')
  await page.history('back')
  isOpen(await page.state(), panel, 'Back from the cross-link')
}

/** What assistive technology is told about the open panel. */
async function accessibility(chrome: Browser, base: string) {
  await driver(chrome, base).load(`${AUSD.page}/${AUSD.id}`)
  const { root } = await chrome.send('DOM.getDocument', { depth: 0 })
  const { nodeId } = await chrome.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'dialog.side-panel' })
  const { nodes } = await chrome.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false })
  const modal = nodes[0].properties?.find((p: { name: string }) => p.name === 'modal')?.value.value
  assert.deepEqual([nodes[0].role.value, nodes[0].name.value, modal], ['dialog', AUSD.title, true])
}

assert.ok(existsSync(join(DIST, 'index.html')), 'dist/ is missing: run `npm run build` first, or use `npm run test:panel`')
const server = serve().listen(0, '127.0.0.1')
await new Promise((done) => server.once('listening', done))
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
let chrome: Browser | undefined
let failed = 0
const check = async (name: string, step: () => Promise<void>) => {
  try {
    await step()
    console.log(`ok    ${name}`)
  } catch (err) {
    failed++
    console.log(`FAIL  ${name}\n      ${err instanceof Error ? err.message : String(err)}`)
  }
}
try {
  const browser = (chrome = await launch())
  for (const width of [390, 1440])
    for (const [panel, other] of [[AUSD, ABTC], [ABTC, AUSD]])
      await check(`${panel.title} at ${width}px: every way in and out`, () => run(browser, base, panel, other, width))
  await check('the open panel is a modal dialog named by its title', () => accessibility(browser, base))
  await check('the page wrote no errors or warnings to the console', async () => assert.deepEqual(browser.problems, []))
} finally {
  chrome?.close()
  server.close()
}
console.log(`\n${failed === 0 ? 'panel test passed' : `${failed} panel checks failed`}`)
process.exit(failed === 0 ? 0 : 1)
