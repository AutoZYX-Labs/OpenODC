// nav-render.js — single source of truth for the site nav.
// Every HTML page renders an empty <nav class="nav"></nav>; this script
// populates it so that the nav is byte-identical across all pages.

function navHtml(lang, langHref) {
  if (lang === 'en') {
    return `
      <a class="brand" href="/en/"><span class="brand-mark">OpenODC</span></a>
      <div class="nav-links">
        <a href="/en/">Home</a>
        <a href="/gallery.html">Gallery</a>
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
  const path = window.location.pathname
  const langHref = isEn
    ? (path.endsWith('/methodology.html') ? '/methodology.html' : (path.endsWith('/tools.html') ? '/tools.html' : '/'))
    : (path.endsWith('/methodology.html') ? '/en/methodology.html' : (path.endsWith('/tools.html') ? '/en/tools.html' : '/en/'))
  navEl.innerHTML = navHtml(isEn ? 'en' : 'zh', langHref).trim()

  const current = window.location.pathname.replace(/\/$/, '/index.html')
  navEl.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href')
    if (!href || href.startsWith('http')) return
    const normalizedHref = href.replace(/\/$/, '/index.html')
    if (current === normalizedHref) a.classList.add('active')
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount)
} else {
  mount()
}
