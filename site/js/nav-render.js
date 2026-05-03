// nav-render.js — single source of truth for the site nav.
// Every HTML page renders an empty <nav class="nav"></nav>; this script
// populates it so that the nav is byte-identical across all pages.

const bilingualPages = new Set([
  'index.html',
  'gallery.html',
  'methodology.html',
  'tools.html',
  'view.html',
  'compare.html',
  'matrix.html',
  'editor.html',
  'workbench.html'
])

function navHtml(lang, langHref) {
  if (lang === 'en') {
    return `
      <a class="brand" href="/en/"><span class="brand-mark">OpenODC</span></a>
      <div class="nav-links">
        <a href="/en/">Home</a>
        <a href="/en/gallery.html">Gallery</a>
        <a href="/en/methodology.html">Method</a>
        <a href="/en/tools.html">Tools</a>
        <span class="nav-divider" aria-hidden="true"></span>
        <a class="lang-toggle" href="${langHref}">中</a>
        <a class="github-link" href="https://github.com/AutoZYX-Labs/OpenODC" target="_blank" rel="noopener">GitHub →</a>
      </div>
    `
  }

  return `
    <a class="brand" href="/"><span class="brand-mark">OpenODC</span></a>
    <div class="nav-links">
      <a href="/">首页</a>
      <a href="/gallery.html">样例库</a>
      <a href="/methodology.html">方法</a>
      <a href="/tools.html">工具台</a>
      <span class="nav-divider" aria-hidden="true"></span>
      <a class="lang-toggle" href="${langHref}">EN</a>
      <a class="github-link" href="https://github.com/AutoZYX-Labs/OpenODC" target="_blank" rel="noopener">GitHub →</a>
    </div>
  `
}

function mount() {
  const navEl = document.querySelector('nav.nav')
  if (!navEl) return
  const isEn = document.documentElement.lang === 'en' || window.location.pathname.startsWith('/en/')
  const langHref = alternateLanguageHref(isEn)
  navEl.innerHTML = navHtml(isEn ? 'en' : 'zh', langHref).trim()

  document.querySelectorAll('.footer-links a').forEach(a => {
    const text = (a.textContent || '').trim().toLowerCase()
    if (text === 'english' || text === '中文') a.setAttribute('href', langHref)
  })

  const current = window.location.pathname.replace(/\/$/, '/index.html')
  navEl.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href')
    if (!href || href.startsWith('http')) return
    const normalizedHref = href.replace(/\/$/, '/index.html')
    if (current === normalizedHref) a.classList.add('active')
  })
}

function alternateLanguageHref(isEn) {
  const url = new URL(window.location.href)
  let path = url.pathname
  if (path === '/en') path = '/en/'
  if (path.endsWith('/')) path += 'index.html'
  const last = path.split('/').pop()
  if (last && !last.includes('.')) path += '.html'
  const query = url.search || ''
  const hash = url.hash || ''

  if (isEn) {
    let zhPath = path.replace(/^\/en\//, '/')
    if (zhPath === '/index.html') zhPath = '/'
    return zhPath + query + hash
  }

  const file = path.split('/').pop() || 'index.html'
  if (!bilingualPages.has(file)) return '/en/' + query + hash
  const enPath = file === 'index.html' ? '/en/' : `/en/${file}`
  return enPath + query + hash
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount)
} else {
  mount()
}
