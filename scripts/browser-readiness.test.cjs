#!/usr/bin/env node
/** Real-browser controls for the acceptance harness; no production endpoints. */
const assert = require('node:assert/strict')
const http = require('node:http')
const path = require('node:path')
const { waitForHydratedDashboard } = require('./browser-readiness.cjs')

const modulePath = process.env.CI_PLAYWRIGHT_MODULE
assert(modulePath && path.isAbsolute(modulePath), 'Set CI_PLAYWRIGHT_MODULE to the isolated toolchain')
const playwright = require(modulePath)
const engine = process.env.CI_BROWSER_ENGINE || 'chromium'
const channel = process.env.CI_BROWSER_CHANNEL || ''
assert(['chromium', 'firefox', 'webkit'].includes(engine), 'Unsupported browser engine')
const pending = new Map()
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const mode = url.searchParams.get('mode')
  res.setHeader('Cache-Control', 'no-store')
  if (url.pathname === '/noncritical' || (url.pathname === '/state' && mode === 'stalled')) {
    pending.set(res, mode)
    res.on('close', () => pending.delete(res))
    return
  }
  if (url.pathname === '/state') {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ soc: mode === 'wrong-soc' ? 41 : mode === 'public' || mode === 'missing-public' ? 61 : 42 }))
    return
  }
  if (url.pathname === '/app.js') {
    if (mode === 'missing-js') { res.writeHead(404).end(); return }
    res.setHeader('Content-Type', 'text/javascript; charset=utf-8')
    res.end(`
      const mode = new URL(location.href).searchParams.get('mode');
      fetch('/noncritical?mode=' + mode);
      fetch('/state?mode=' + mode).then(response => response.json()).then(state => {
        const soc = document.createElement('span');
        soc.textContent = state.soc + '%';
        document.body.append(soc);
        const status = document.createElement('span');
        status.dataset.testid = 'transport-status';
        status.dataset.connected = mode === 'disconnected' ? 'false' : 'true';
        status.textContent = mode === 'public' ? 'PUBLIC · READ-ONLY' : 'Connected';
        document.body.append(status);
      });
    `)
    return
  }
  if (url.pathname === '/') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    // Mode is selected from the fixed test cases below, never external input.
    const modes = new Set(['ready', 'missing-js', 'stalled', 'wrong-soc', 'public', 'missing-public', 'disconnected'])
    assert(modes.has(mode), 'Unknown fixture mode')
    res.end(`<!doctype html><title>Readiness control</title><script defer src="/app.js?mode=${mode}"></script>`)
    return
  }
  res.writeHead(404).end()
})

async function runReadinessControls() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  let browser
  try {
    browser = await playwright[engine].launch({ headless: true, ...(channel ? { channel } : {}) })
    const cases = [
      { mode: 'ready', soc: 42 },
      { mode: 'public', soc: 61, publicMode: true },
      { mode: 'missing-js', soc: 42, rejects: true },
      { mode: 'stalled', soc: 42, rejects: true },
      { mode: 'disconnected', soc: 42, rejects: true },
      { mode: 'wrong-soc', soc: 42, rejects: true },
      { mode: 'missing-public', soc: 61, publicMode: true, rejects: true },
    ]
    // Each control uses a fresh browser context, so storage or stale DOM cannot satisfy readiness.
    await Promise.all(cases.map(async ({ mode, soc, publicMode = false, rejects = false }) => {
      const context = await browser.newContext({ serviceWorkers: 'block' })
      context.setDefaultTimeout(10000)
      context.setDefaultNavigationTimeout(15000)
      try {
        const blocked = []
        await context.route('**/*', route => {
          const url = new URL(route.request().url())
          if (url.origin === `http://127.0.0.1:${server.address().port}`) return route.continue()
          blocked.push(url.origin)
          return route.abort('blockedbyclient')
        })
        const page = await context.newPage()
        await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}`, { waitUntil: 'load' })
        if (rejects) {
          await assert.rejects(waitForHydratedDashboard(page, soc, publicMode), { name: 'TimeoutError' })
        } else {
          await waitForHydratedDashboard(page, soc, publicMode)
          assert([...pending.values()].includes(mode), 'Readiness must pass while its noncritical request is outstanding')
        }
        assert.deepEqual(blocked, [], 'Control fixtures must remain local')
        console.log(`PASS readiness ${mode}${rejects ? ' rejected' : ' with pending traffic'}`)
      } finally {
        await context.close()
      }
    }))
    return cases.map(({ mode, rejects = false }) => ({ mode, expectedRejection: rejects, passed: true }))
  } finally {
    if (browser) await browser.close()
    for (const response of pending.keys()) response.destroy()
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
  }
}

module.exports = { runReadinessControls }
if (require.main === module) runReadinessControls().catch(error => { console.error(error); process.exitCode = 1 })
