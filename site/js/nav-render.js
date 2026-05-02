// nav-render.js — single source of truth for the site nav.
// Every HTML page renders an empty <nav class="nav"></nav>; this script
// populates it so that the nav is byte-identical across all pages.

const NAV_HTML_ZH = `
  <a class="brand" href="/"><span class="brand-mark">OpenODC</span></a>
  <div class="nav-links">
    <div class="nav-group">
      <button type="button" class="nav-group-trigger">浏览 <span class="caret">▾</span></button>
      <ul class="nav-group-menu">
        <li><a href="/gallery.html">样例库</a></li>
        <li><a href="/matrix.html">横向矩阵</a></li>
        <li><a href="/compare.html">多车对比</a></li>
      </ul>
    </div>
    <div class="nav-group">
      <button type="button" class="nav-group-trigger">创建 <span class="caret">▾</span></button>
      <ul class="nav-group-menu">
        <li><a href="/editor.html">编辑器</a></li>
        <li><a href="/workbench.html">厂家直填</a></li>
      </ul>
    </div>
    <a href="/#standard">标准对照</a>
    <span class="nav-divider" aria-hidden="true"></span>
    <a class="lang-toggle" href="/en/">EN</a>
    <a class="github-link" href="https://github.com/AutoZYX-Labs/OpenODC" target="_blank" rel="noopener">GitHub →</a>
  </div>
`

const NAV_HTML_EN = `
  <a class="brand" href="/en/"><span class="brand-mark">OpenODC</span></a>
  <div class="nav-links">
    <div class="nav-group">
      <button type="button" class="nav-group-trigger">Browse <span class="caret">▾</span></button>
      <ul class="nav-group-menu">
        <li><a href="/gallery.html">Gallery</a></li>
        <li><a href="/matrix.html">Matrix</a></li>
        <li><a href="/compare.html">Compare</a></li>
      </ul>
    </div>
    <div class="nav-group">
      <button type="button" class="nav-group-trigger">Create <span class="caret">▾</span></button>
      <ul class="nav-group-menu">
        <li><a href="/editor.html">Editor</a></li>
        <li><a href="/workbench.html">Workbench</a></li>
      </ul>
    </div>
    <a href="/en/#standard">Standard</a>
    <span class="nav-divider" aria-hidden="true"></span>
    <a class="lang-toggle" href="/">中</a>
    <a class="github-link" href="https://github.com/AutoZYX-Labs/OpenODC" target="_blank" rel="noopener">GitHub →</a>
  </div>
`

function mount() {
  const navEl = document.querySelector('nav.nav')
  if (!navEl) return
  const isEn = document.documentElement.lang === 'en' || window.location.pathname.startsWith('/en/')
  navEl.innerHTML = (isEn ? NAV_HTML_EN : NAV_HTML_ZH).trim()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount)
} else {
  mount()
}
