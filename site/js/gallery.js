import { loadManifest, adsLevelLabel, reviewStatusLabel, el } from './common.js'

const grid = document.getElementById('gallery-grid')
const filterLevel = document.getElementById('filter-level')
const filterStatus = document.getElementById('filter-status')
const filterSearch = document.getElementById('filter-search')
const filterCount = document.getElementById('filter-count')
const emptyCta = document.getElementById('empty-cta')
const isEn = document.documentElement.lang === 'en' || window.location.pathname.startsWith('/en/')
const lang = isEn ? 'en' : 'zh'

const copy = {
  zh: {
    records: '条记录',
    coverageTitle: (direct, community, inferred, gap, structural) => `官方/手册 ${direct} · 社区整理 ${community} · 推定 ${inferred} · 公开资料未明确 ${gap} · 结构性 ${structural}`,
    coverageSub: pct => ` 公开资料覆盖（${pct}%）`,
    highConfidence: n => `${n} 项高置信证据`,
    officialManual: n => `${n} 项官方/手册`,
    linked: n => `${n} 项逐项引用`,
    permitted: n => `允许 ${n}`,
    notPermitted: n => `不允许 ${n}`,
    total: n => `共 ${n} 项`,
    verified: d => `证据核验至 ${d}`,
    loadFailed: msg => `加载失败：${msg}`
  },
  en: {
    records: 'records',
    coverageTitle: (direct, community, inferred, gap, structural) => `official/manual ${direct} · curated ${community} · inferred ${inferred} · public-source gap ${gap} · structural ${structural}`,
    coverageSub: pct => ` public-source coverage (${pct}%)`,
    highConfidence: n => `${n} high-confidence evidence items`,
    officialManual: n => `${n} official/manual items`,
    linked: n => `${n} element-level references`,
    permitted: n => `Permitted ${n}`,
    notPermitted: n => `Not permitted ${n}`,
    total: n => `${n} elements`,
    verified: d => `Evidence verified ${d}`,
    loadFailed: msg => `Load failed: ${msg}`
  }
}

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
  filterCount.textContent = `${docs.length} / ${allDocs.length} ${copy[lang].records}`
  emptyCta.hidden = docs.length > 0
  for (const d of docs) {
    grid.appendChild(card(d))
  }
}

function card(d) {
  const viewPath = lang === 'en' ? '/en/view.html' : '/view.html'
  const node = el('a', { href: `${viewPath}?id=${encodeURIComponent(d.id)}`, class: 'doc-card' })
  const vendor = isEn ? (d.vendor_en || d.vendor) : d.vendor
  const model = isEn ? (d.model_en || d.model) : d.model
  const functionName = isEn ? (d.function_name_en || d.function_name) : d.function_name
  node.appendChild(el('div', { class: 'doc-card-header' }, [
    el('span', { class: `ads-pill ads-pill-l${d.ads_level}` }, adsLevelLabel(d.ads_level)),
    el('span', { class: `status-pill status-${d.review_status}` }, reviewStatusLabel(d.review_status, lang))
  ]))
  node.appendChild(el('h3', { class: 'doc-card-title' }, vendor + ' · ' + model))
  node.appendChild(el('p', { class: 'doc-card-function' }, functionName))

  // Public-source coverage strip
  if (d.coverage && d.element_count) {
    const subst = d.coverage_substantive || 0
    const pct = Math.round((subst / d.element_count) * 100)
    const direct = (d.coverage.manual || 0) + (d.coverage.official || 0)
    const community = d.coverage.curated || 0
    const inferred = d.coverage.inferred || 0
    const gap = d.coverage.gap || 0
    const structural = d.coverage.structural || 0
    const covWrap = el('div', { class: 'doc-card-coverage', title: copy[lang].coverageTitle(direct, community, inferred, gap, structural) })
    covWrap.appendChild(el('div', { class: 'cov-label' }, [
      el('strong', {}, `${subst} / ${d.element_count}`),
      el('span', { class: 'cov-sub' }, copy[lang].coverageSub(pct))
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

  if (d.evidence) {
    node.appendChild(el('div', { class: 'doc-card-evidence' }, [
      el('span', { class: 'evidence-metric evidence-strong' }, copy[lang].highConfidence(d.evidence.high_confidence || 0)),
      el('span', { class: 'evidence-metric' }, copy[lang].officialManual(d.evidence.official_or_manual || 0)),
      el('span', { class: 'evidence-metric' }, copy[lang].linked(d.evidence.linked || 0))
    ]))
  }

  node.appendChild(el('div', { class: 'doc-card-stats' }, [
    el('span', { class: 'stat-item stat-permitted' }, copy[lang].permitted(d.permitted_count)),
    el('span', { class: 'stat-item stat-not-permitted' }, copy[lang].notPermitted(d.not_permitted_count)),
    el('span', { class: 'stat-item' }, copy[lang].total(d.element_count))
  ]))
  const metaParts = []
  if (d.evidence_as_of) metaParts.push(copy[lang].verified(d.evidence_as_of))
  else if (d.effective_date) metaParts.push(d.effective_date)
  if (d.software_version) metaParts.push(d.software_version)
  node.appendChild(el('p', { class: 'doc-card-meta' }, metaParts.join(' · ')))
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
    grid.innerHTML = `<p class="error">${copy[lang].loadFailed(e.message)}</p>`
  }
})()
