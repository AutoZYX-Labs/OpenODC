import { loadManifest, adsLevelLabel, reviewStatusLabel, el } from './common.js'

const grid = document.getElementById('gallery-grid')
const filterLevel = document.getElementById('filter-level')
const filterStatus = document.getElementById('filter-status')
const filterSearch = document.getElementById('filter-search')
const filterCount = document.getElementById('filter-count')
const emptyCta = document.getElementById('empty-cta')

let allDocs = []

function applyFilters() {
  const level = filterLevel.value
  const status = filterStatus.value
  const q = filterSearch.value.trim().toLowerCase()
  const filtered = allDocs.filter(d => {
    if (level !== '' && String(d.ads_level) !== level) return false
    if (status !== '' && d.review_status !== status) return false
    if (q) {
      const haystack = [d.vendor, d.vendor_en, d.model, d.model_en, d.function_name, d.function_name_en].filter(Boolean).join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
  render(filtered)
}

function render(docs) {
  grid.innerHTML = ''
  filterCount.textContent = `${docs.length} / ${allDocs.length} 条记录`
  emptyCta.hidden = docs.length > 0
  for (const d of docs) {
    grid.appendChild(card(d))
  }
}

function card(d) {
  const node = el('a', { href: `/view.html?id=${encodeURIComponent(d.id)}`, class: 'doc-card' })
  node.appendChild(el('div', { class: 'doc-card-header' }, [
    el('span', { class: `ads-pill ads-pill-l${d.ads_level}` }, adsLevelLabel(d.ads_level)),
    el('span', { class: `status-pill status-${d.review_status}` }, reviewStatusLabel(d.review_status))
  ]))
  node.appendChild(el('h3', { class: 'doc-card-title' }, d.vendor + ' · ' + d.model))
  node.appendChild(el('p', { class: 'doc-card-function' }, d.function_name))

  // Public-source coverage strip
  if (d.coverage && d.element_count) {
    const subst = d.coverage_substantive || 0
    const pct = Math.round((subst / d.element_count) * 100)
    const direct = (d.coverage.manual || 0) + (d.coverage.official || 0)
    const community = d.coverage.curated || 0
    const inferred = d.coverage.inferred || 0
    const gap = d.coverage.gap || 0
    const structural = d.coverage.structural || 0
    const covWrap = el('div', { class: 'doc-card-coverage', title: `官方/手册 ${direct} · 社区整理 ${community} · 推定 ${inferred} · 公开资料未明确 ${gap} · 结构性 ${structural}` })
    covWrap.appendChild(el('div', { class: 'cov-label' }, [
      el('strong', {}, `${subst} / ${d.element_count}`),
      el('span', { class: 'cov-sub' }, ` 公开资料覆盖（${pct}%）`)
    ]))
    const segBar = el('div', { class: 'cov-bar' })
    const segs = [
      { cls: 'seg-manual', count: direct },
      { cls: 'seg-community', count: community },
      { cls: 'seg-inferred', count: inferred },
      { cls: 'seg-gap', count: gap },
      { cls: 'seg-structural', count: structural }
    ]
    for (const s of segs) {
      if (s.count > 0) segBar.appendChild(el('span', { class: 'seg ' + s.cls, style: `flex:${s.count}` }))
    }
    covWrap.appendChild(segBar)
    node.appendChild(covWrap)
  }

  node.appendChild(el('div', { class: 'doc-card-stats' }, [
    el('span', { class: 'stat-item stat-permitted' }, `允许 ${d.permitted_count}`),
    el('span', { class: 'stat-item stat-not-permitted' }, `不允许 ${d.not_permitted_count}`),
    el('span', { class: 'stat-item' }, `共 ${d.element_count} 项`)
  ]))
  node.appendChild(el('p', { class: 'doc-card-meta' }, d.effective_date + (d.software_version ? ' · ' + d.software_version : '')))
  return node
}

;(async () => {
  try {
    const manifest = await loadManifest()
    allDocs = manifest.documents
    applyFilters()
    filterLevel.addEventListener('change', applyFilters)
    filterStatus.addEventListener('change', applyFilters)
    filterSearch.addEventListener('input', applyFilters)
  } catch (e) {
    grid.innerHTML = `<p class="error">加载失败：${e.message}</p>`
  }
})()
