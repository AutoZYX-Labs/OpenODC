// nav-render.js — single source of truth for the site nav.
// Every HTML page renders an empty <nav class="nav"></nav>; this script
// populates it so that the nav is byte-identical across all pages.

function navHtml(lang, langHref) {
  if (lang === 'en') {
    return `
      <a class="brand" href="/en/"><span class="brand-mark">OpenODC</span></a>
      <div class="nav-links">
        <a href="/gallery.html">Gallery</a>
        <a href="/compare.html">Compare</a>
        <a href="/matrix.html">Matrix</a>
        <a href="/editor.html">Editor</a>
        <a href="/en/methodology.html">Method</a>
        <a href="/workbench.html">Workbench</a>
        <span class="nav-divider" aria-hidden="true"></span>
        <a class="lang-toggle" href="${langHref}">中</a>
        <a class="github-link" href="https://github.com/AutoZYX-Labs/OpenODC" target="_blank" rel="noopener">GitHub →</a>
      </div>
    `
  }

  return `
    <a class="brand" href="/"><span class="brand-mark">OpenODC</span></a>
    <div class="nav-links">
      <a href="/gallery.html">样例库</a>
      <a href="/compare.html">对比</a>
      <a href="/matrix.html">矩阵</a>
      <a href="/editor.html">编辑器</a>
      <a href="/methodology.html">方法与标准</a>
      <a href="/workbench.html">厂家直填</a>
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
  const langHref = isEn
    ? (window.location.pathname.endsWith('/methodology.html') ? '/methodology.html' : '/')
    : (window.location.pathname.endsWith('/methodology.html') ? '/en/methodology.html' : '/en/')
  navEl.innerHTML = navHtml(isEn ? 'en' : 'zh', langHref).trim()

  const current = window.location.pathname.replace(/\/$/, '/index.html')
  navEl.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href')
    if (!href || href.startsWith('http') || href === '/' || href === '/en/') return
    if (current === href) a.classList.add('active')
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount)
} else {
  mount()
}
