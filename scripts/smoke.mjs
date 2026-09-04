/* Temporary smoke test — drives headless Chrome via CDP (Node >= 22 global WebSocket). */
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://127.0.0.1:4173'
const PORT = 9444
const userDir = mkdtempSync(join(tmpdir(), 'binge-smoke-'))

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function waitFor(fn, timeout = 15000, step = 200) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try { const v = await fn(); if (v) return v } catch { /* retry */ }
    await sleep(step)
  }
  throw new Error('waitFor timeout')
}

let chrome
try {
  chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`, 'about:blank',
  ], { stdio: 'ignore' })

  const target = await waitFor(async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })
    return res.ok ? res.json() : null
  })
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })

  let id = 0
  const pending = new Map()
  const jsErrors = []
  const consoleErrors = []
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return }
    if (m.method === 'Runtime.exceptionThrown') {
      jsErrors.push(m.params.exceptionDetails?.exception?.description ?? m.params.exceptionDetails?.text ?? 'exception')
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      consoleErrors.push(m.params.args.map(a => a.value ?? a.description ?? '').join(' '))
    }
  }
  const send = (method, params = {}) => new Promise((resolve) => {
    const mid = ++id
    pending.set(mid, resolve)
    ws.send(JSON.stringify({ id: mid, method, params }))
  })
  const evalJs = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.result?.exceptionDetails) {
      return { __error: r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text }
    }
    return r.result?.result?.value
  }
  await send('Page.enable')
  await send('Runtime.enable')

  let fails = 0
  let passCount = 0
  const ok = (msg) => { passCount++; console.log('  ✓', msg) }
  const bad = (msg) => { fails++; console.log('  ✗', msg) }

  const go = async (url, settle = 5000) => {
    jsErrors.length = 0
    consoleErrors.length = 0
    await send('Page.navigate', { url })
    const moved = await waitFor(async () => (await evalJs('location.href'))?.startsWith(BASE), 8000, 250).catch(() => false)
    if (!moved) {
      // CDP navigation can silently fail on some headless builds — fall back to a direct nav.
      await evalJs(`location.href = ${JSON.stringify(url)}`)
      await waitFor(async () => (await evalJs('location.href'))?.startsWith(BASE), 8000, 250).catch(() => {})
    }
    await sleep(settle)
  }

  const VIEWPORTS = [
    [320, 568], [375, 667], [414, 896], [768, 1024],
    [1024, 768], [1280, 800], [1440, 900], [1920, 1080],
  ]

  for (const [w, h] of VIEWPORTS) {
    console.log(`\n== viewport ${w}x${h} ==`)
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false })
    for (const route of ['/', '/movies', '/tv', '/login']) {
      await go(BASE + route)
      const m = await evalJs(`(() => {
        const de = document.documentElement
        const nr = document.querySelector('.navbar-right')
        const r = nr?.getBoundingClientRect()
        return {
          path: location.pathname,
          ready: document.readyState,
          rootHtml: (document.getElementById('root')?.innerHTML || '').length,
          overflow: de.scrollWidth - de.clientWidth,
          cards: document.querySelectorAll('.movie-card').length,
          carouselTitle: !!document.querySelector('.carousel-title'),
          authCard: !!document.querySelector('.auth-modal'),
          navRightOverflow: r ? Math.round(r.right) > window.innerWidth : false,
          errorStates: document.querySelectorAll('.error-state').length,
        }
      })()`)
      const tag = `${route} ${w}x${h}`
      if (m.__error) { bad(`${tag} evaluate error ${m.__error}`); continue }
      if (jsErrors.length) { bad(`${tag} JS error: ${jsErrors[0].slice(0, 120)}`); continue }
      if (consoleErrors.length) { bad(`${tag} console error: ${consoleErrors[0].slice(0, 120)}`); continue }
      if (m.rootHtml < 500) { bad(`${tag} root nearly empty (${m.rootHtml})`); continue }
      if (m.overflow > 0) { bad(`${tag} horizontal overflow ${m.overflow}px`); continue }
      if (m.navRightOverflow) { bad(`${tag} navbar-right outside viewport`); continue }
      if (route === '/login' && !m.authCard) { bad(`${tag} no auth card`); continue }
      if (route === '/' && !m.cards && !m.carouselTitle) { bad(`${tag} no home content`); continue }
      ok(tag)
    }
  }

  // Home needs detail links for later steps.
  console.log('\n== home content + details ==')
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false })
  await go(BASE + '/')
  const links = await evalJs(`(() => ({
    movie: [...document.querySelectorAll('a[href^="/movie/"]')].map(a => a.getAttribute('href'))[0] || null,
    tv: [...document.querySelectorAll('a[href^="/tv/"]')].map(a => a.getAttribute('href'))[0] || null,
    cardCount: document.querySelectorAll('.movie-card').length,
  }))()`)
  if (links.__error) { bad('home scrape error ' + links.__error) }
  else {
    ok(`home rendered ${links.cardCount} cards`)
    if (links.movie) {
      await go(BASE + links.movie, 6000)
      const md = await evalJs(`(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        title: document.querySelector('.details-title')?.textContent || null,
        watch: !!document.querySelector('.details-watch-btn'),
      }))()`)
      if (md.__error || jsErrors.length || consoleErrors.length) bad('movie details failed')
      else if (md.overflow > 0) bad('movie details overflow ' + md.overflow)
      else if (md.title) ok(`movie details render "${md.title.slice(0, 30)}"`)
      else bad('movie details missing title')
    } else bad('no movie link on home')
    if (links.tv) {
      await go(BASE + links.tv, 7000)
      const td = await evalJs(`(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        title: document.querySelector('.details-title')?.textContent || null,
        seasons: document.querySelectorAll('.season-card').length,
        episodes: document.querySelectorAll('.episode-row').length,
      }))()`)
      if (td.__error || jsErrors.length || consoleErrors.length) bad('tv details failed')
      else if (td.overflow > 0) bad('tv details overflow ' + td.overflow)
      else if (td.title) ok(`tv details render "${td.title.slice(0, 30)}" (${td.seasons} seasons, ${td.episodes} episodes listed)`)
      else bad('tv details missing title')
    } else bad('no tv link on home')
  }

  console.log('\n== auth flow (375px) ==')
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 667, deviceScaleFactor: 1, mobile: false })
  await go(BASE + '/login')
  const flow = await evalJs(`(async () => {
    const wait = (ms) => new Promise(r => setTimeout(r, ms))
    const setVal = (el, v) => {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
    const email = document.querySelector('input[type=email]')
    const pass = document.querySelector('input[type=password]')
    if (!email || !pass) return { step: 'fields-missing' }
    setVal(email, 'smoke@test.dev')
    setVal(pass, 'secret123')
    const form = document.querySelector('.auth-form')
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await wait(1500)
    return {
      step: 'submitted',
      path: location.pathname,
      chip: !!document.querySelector('.navbar-user-chip'),
      stored: !!localStorage.getItem('bingetime.auth.user'),
    }
  })()`)
  if (flow.__error) { bad('login flow error: ' + flow.__error.slice(0, 200)) }
  else if (flow.step === 'fields-missing') { bad('login fields missing') }
  else if (flow.path === '/' && flow.chip && flow.stored) { ok('login → redirect home + user chip + session') }
  else { bad('login flow unexpected: ' + JSON.stringify(flow)) }

  const out = await evalJs(`(async () => {
    const wait = (ms) => new Promise(r => setTimeout(r, ms))
    document.querySelector('.navbar-user-chip')?.click()
    await wait(150)
    document.querySelector('.navbar-user-menu-item')?.click()
    await wait(300)
    return {
      loginCta: !!document.querySelector('.navbar-auth-btn'),
      stored: !!localStorage.getItem('bingetime.auth.user'),
      path: location.pathname,
    }
  })()`)
  if (out.__error) bad('logout error: ' + out.__error.slice(0, 200))
  else if (out.loginCta && !out.stored) ok('logout clears session, shows Log in')
  else bad('logout unexpected: ' + JSON.stringify(out))

  console.log('\n== navbar search open (375px) ==')
  await go(BASE + '/movies')
  const so = await evalJs(`(async () => {
    const wait = (ms) => new Promise(r => setTimeout(r, ms))
    document.querySelector('.navbar-search-btn')?.click()
    await wait(400)
    const de = document.documentElement
    const input = document.querySelector('.navbar-search-input')
    return {
      overflow: de.scrollWidth - de.clientWidth,
      focused: document.activeElement === input,
    }
  })()`)
  if (so.__error || so.overflow > 0) bad('search-open overflow/error ' + JSON.stringify(so))
  else ok(`search opens without overflow (focused=${so.focused})`)

  const so2 = await evalJs(`(async () => {
    const wait = (ms) => new Promise(r => setTimeout(r, ms))
    const input = document.querySelector('.navbar-search-input')
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'star')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await wait(3000)
    const de = document.documentElement
    const dd = document.querySelector('.search-suggestions')
    const rect = dd?.getBoundingClientRect()
    return {
      overflow: de.scrollWidth - de.clientWidth,
      items: document.querySelectorAll('.search-suggestion-item').length,
      inViewport: rect ? rect.left >= 0 && rect.right <= window.innerWidth : null,
    }
  })()`)
  if (so2.__error) bad('suggestions error: ' + so2.__error.slice(0, 200))
  else if (so2.overflow > 0) bad('suggestions overflow ' + so2.overflow)
  else if (so2.items > 0 && so2.inViewport) ok(`suggestions dropdown fits (${so2.items} items)`)
  else bad('suggestions unexpected: ' + JSON.stringify(so2))

  console.log(`\n── SUMMARY: ${passCount} passed, ${fails} failed ──`)
  ws.close()
  chrome.kill()
  try { rmSync(userDir, { recursive: true, force: true, maxRetries: 3 }) } catch { /* locked */ }
  process.exit(fails ? 1 : 0)
} catch (err) {
  console.error('smoke harness error:', err)
  try { chrome?.kill() } catch { /* noop */ }
  process.exit(2)
}
