// Browser tests against the built app (run npm run build first). They use the Chrome or
// Edge already on the computer through playwright-core, so nothing is downloaded. When no
// browser is found the tests are skipped with a message. Exit code 1 means a failure.
//   F1  larger text never makes the page scroll sideways (intake and review, 440 and 360 px)
//   F2  a label with a bad warning title never shows "Ready to approve" at any moment
//   F7  a full review makes no failed request (such as a missing favicon) and logs no console error
import { chromium } from 'playwright-core'
import { existsSync, readFileSync } from 'node:fs'
import { startServer } from '../../scripts/serve-dist.js'

const results = JSON.parse(readFileSync('tests/expected-results.json', 'utf8'))
const label = (id) => results.find((r) => r.id === id)

async function launch() {
  for (const channel of ['chrome', 'msedge']) {
    try { return await chromium.launch({ channel }) } catch { /* try the next one */ }
  }
  return null
}

if (!existsSync('dist/index.html')) { console.error('Run npm run build first.'); process.exit(1) }
const browser = await launch()
if (!browser) { console.log('No Chrome or Edge found: browser tests skipped.'); process.exit(0) }
const { server, url } = await startServer('dist')

let failed = 0
const check = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`); if (!ok) failed++ }

async function open(width, textSize) {
  const context = await browser.newContext({ viewport: { width, height: 800 } })
  await context.addInitScript((size) => { if (size) localStorage.setItem('labelcheck-text-size', size) }, textSize)
  const page = await context.newPage()
  await page.goto(url)
  await page.keyboard.press('Escape') // the tour opens with the app
  return { page, context }
}

async function loadLabel(page, id) {
  const r = label(id)
  await page.fill('#apptext', r.applicationText)
  await page.setInputFiles('input[type=file]', r.image)
  await page.waitForFunction(() => /^Read in|^First read/.test(document.querySelector('.step-head .pill')?.textContent.replace(/^\S\s*/, '') ?? '') || /Read in/.test(document.querySelector('.step-head .pill')?.textContent ?? ''), null, { timeout: 60000 })
}

const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)

try {
  // F1: the largest text size
  for (const width of [440, 360]) {
    const { page, context } = await open(width, '1.5')
    check(!(await sideways(page)), `F1 intake at ${width}px, largest text: no sideways scroll`)
    await loadLabel(page, 'c01-clean-bourbon')
    check(!(await sideways(page)), `F1 intake with a label loaded at ${width}px, largest text: no sideways scroll`)
    await page.click('.btn-start')
    await page.waitForSelector('.tier')
    check(!(await sideways(page)), `F1 review at ${width}px, largest text: no sideways scroll`)
    await context.close()
  }

  // F7: no failed request and no console error during a full review
  {
    const { page, context } = await open(440, null)
    const problems = []
    page.on('response', (r) => { if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`) })
    page.on('console', (m) => { if (m.type() === 'error') problems.push(`console error: ${m.text()}`) })
    page.on('pageerror', (e) => problems.push(`page error: ${e.message}`))
    await page.reload()
    await page.keyboard.press('Escape')
    await loadLabel(page, 'c01-clean-bourbon')
    await page.click('.btn-start')
    await page.waitForSelector('.tier')
    await page.waitForTimeout(1500)
    check(problems.length === 0, `F7 full review: no failed request or console error ${problems.length ? JSON.stringify(problems) : ''}`)
    await context.close()
  }

  // F2: every banner state for labels with a bad warning title
  for (const id of ['d18-warning-title-not-bold', 'd19-warning-all-bold']) {
    const { page, context } = await open(440, null)
    await loadLabel(page, id)
    await page.evaluate(() => {
      window.__banners = []
      const log = () => { const t = document.querySelector('.tier .name, .chip')?.textContent; if (t && window.__banners.at(-1) !== t) window.__banners.push(t) }
      new MutationObserver(log).observe(document.body, { subtree: true, childList: true, characterData: true })
    })
    await page.click('.btn-start')
    await page.waitForTimeout(2500)
    const banners = await page.evaluate(() => window.__banners)
    check(!banners.some((t) => /Ready to approve/.test(t)), `F2 ${id}: banner states ${JSON.stringify(banners)} never include Ready to approve`)
    check(/Needs review|Likely reject/.test(banners.at(-1) ?? ''), `F2 ${id}: ends at Needs review or Likely reject`)
    await context.close()
  }
} finally {
  await browser.close()
  server.close()
}
console.log(failed ? `${failed} browser check(s) failed` : 'Browser checks passed')
process.exit(failed ? 1 : 0)
