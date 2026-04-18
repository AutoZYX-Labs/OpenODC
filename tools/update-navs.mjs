// update-navs.mjs
// Replace each page's inline nav with an empty <nav class="nav"></nav> shell
// and ensure /js/nav-render.js is loaded. Single source of truth is then
// /site/js/nav-render.js — all pages render byte-identical nav.

import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const siteRoot = join(__dirname, '..', 'site')

const PAGES = [
  'index.html', 'gallery.html', 'compare.html', 'matrix.html',
  'view.html', 'editor.html', 'workbench.html', 'en/index.html'
]

const SHELL = `    <nav class="nav"></nav>`

for (const p of PAGES) {
  const path = join(siteRoot, p)
  let html = readFileSync(path, 'utf8')

  // Replace the existing <nav class="nav">…</nav> block with an empty shell
  const navRe = /[ \t]*<nav class="nav">[\s\S]*?<\/nav>/
  if (!navRe.test(html)) { console.warn('no nav block in', p); continue }
  html = html.replace(navRe, SHELL)

  // Ensure nav-render.js is loaded (idempotent — skip if already present)
  if (!html.includes('/js/nav-render.js')) {
    // Inject before </body>
    html = html.replace(/(\s*)<\/body>/, `$1  <script type="module" src="/js/nav-render.js"></script>$1</body>`)
  }

  writeFileSync(path, html, 'utf8')
  console.log('updated', p)
}
