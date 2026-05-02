// check-source-links.mjs
// Audits URLs listed in data/examples/*.json metadata.sources.
//
// Default mode is report-only because some official sites block bots
// (notably Tesla) while still being valid in a browser. Use --strict in CI
// if all sources are expected to return 2xx/3xx.

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const strict = process.argv.includes('--strict')
const examplesDir = join(process.cwd(), 'data', 'examples')
const sourceUrlRe = /(https?:\/\/\S+)/g
const botSensitiveHosts = new Set([
  'aito.auto',
  'qh.sz.gov.cn',
  'www.apollogo.com',
  'ir.pony.ai',
  'www.tesla.com',
  'www.tesla.cn'
])

function unique(items) {
  return Array.from(new Map(items.map(x => [x.url, x])).values())
}

function sourceUrls() {
  const urls = []
  for (const file of readdirSync(examplesDir).filter(f => f.endsWith('.json')).sort()) {
    const doc = JSON.parse(readFileSync(join(examplesDir, file), 'utf8'))
    for (const source of doc.metadata?.sources || []) {
      const matches = source.match(sourceUrlRe) || []
      for (const raw of matches) {
        urls.push({ file, url: raw.replace(/[),.;]+$/, '') })
      }
    }
  }
  return unique(urls)
}

async function probe({ file, url }) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  const headers = { 'user-agent': 'OpenODC link audit (+https://openodc.autozyx.com)' }

  try {
    let response = await fetch(url, { method: 'HEAD', redirect: 'follow', headers, signal: controller.signal })
    if (response.status === 405 || response.status === 403) {
      response = await fetch(url, { method: 'GET', redirect: 'follow', headers, signal: controller.signal })
    }
    const status = response.status
    const state = status >= 200 && status < 400
      ? 'ok'
      : [401, 403, 405, 429].includes(status)
        ? 'blocked'
        : 'broken'
    return { file, url, state, status, finalUrl: response.url }
  } catch (error) {
    const host = new URL(url).hostname
    const state = botSensitiveHosts.has(host) ? 'blocked' : 'broken'
    return { file, url, state, status: 'ERR', finalUrl: '', error: error.name || error.message }
  } finally {
    clearTimeout(timeout)
  }
}

const results = []
for (const item of sourceUrls()) {
  results.push(await probe(item))
}

for (const r of results) {
  const suffix = r.error ? ` · ${r.error}` : ''
  console.log(`${r.state.toUpperCase().padEnd(7)} ${String(r.status).padEnd(4)} ${r.file} :: ${r.url}${suffix}`)
}

const counts = results.reduce((acc, r) => {
  acc[r.state] = (acc[r.state] || 0) + 1
  return acc
}, {})

console.log(`\nSummary: ${counts.ok || 0} ok · ${counts.blocked || 0} blocked · ${counts.broken || 0} broken`)

if (strict && (counts.broken || 0) > 0) {
  process.exitCode = 1
}
