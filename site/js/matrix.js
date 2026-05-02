import { loadCatalog, loadManifest, loadDocument, buildElementIndex, adsLevelLabel, el } from './common.js'

const headEl = document.getElementById('matrix-head')
const bodyEl = document.getElementById('matrix-body')
const catSel = document.getElementById('f-category')
const covSel = document.getElementById('f-coverage')
const searchInput = document.getElementById('f-search')
const countEl = document.getElementById('matrix-count')

let catalog, elementIndex
let docs = []              // [{ manifestEntry, odc, elementMap: Map }]
let categories = []        // top-level

function classifyCoverage(description, parameterRange) {
  const text = (description || '') + ' ' + (parameterRange || '')
  if (!text.trim()) return 'curated'
  if (text.includes('[手册未涉及]')) return 'gap'
  if (text.includes('[公开资料未明确]')) return 'gap'
  if (text.includes('[结构性类别]')) return 'structural'
  if (text.includes('[手册明确]')) return 'manual'
  if (text.includes('[官方声明]')) return 'official'
  if (text.includes('[推定]')) return 'inferred'
  return 'curated'
}

function requirementClass(elementEntry) {
  if (!elementEntry) return 'req-none'
  const cov = classifyCoverage(elementEntry.description, elementEntry.parameter_range)
  if (cov === 'gap') return 'req-gap'
  if (cov === 'structural') return 'req-structural'
  if (elementEntry.requirement === 'not_permitted') return 'req-not_permitted'
  return 'req-permitted'
}

function cellLabel(elementEntry) {
  if (!elementEntry) return '—'
  const cov = classifyCoverage(elementEntry.description, elementEntry.parameter_range)
  if (cov === 'gap') return '未明确'
  if (cov === 'structural') return '结构'
  return elementEntry.requirement === 'not_permitted' ? '不允许' : '允许'
}

function cellTooltip(elementEntry) {
  if (!elementEntry) return '没有数据'
  const parts = []
  parts.push(elementEntry.requirement === 'permitted' ? '允许' : '不允许')
  if (elementEntry.parameter_range) parts.push('· ' + elementEntry.parameter_range)
  if (elementEntry.description) parts.push('\n' + elementEntry.description)
  if (elementEntry.exit_behavior) parts.push('\n退出行为: ' + elementEntry.exit_behavior)
  return parts.join(' ')
}

function allElements() {
  // flat list of all elements with meta, ordered by category/section
  const all = []
  for (const cat of catalog.categories) {
    for (const e of cat.elements) {
      all.push({
        ...e,
        topCategoryId: cat.category_id,
        topCategoryName: cat.name_zh
      })
    }
  }
  return all
}

function isDivergent(elementId) {
  // A row is "divergent" if at least two docs give different requirement classes
  const seen = new Set()
  for (const d of docs) {
    const e = d.elementMap.get(elementId)
    if (!e) { seen.add('none'); continue }
    const cls = requirementClass(e)
    seen.add(cls)
    if (seen.size > 1) return true
  }
  return false
}

function render() {
  const q = searchInput.value.trim().toLowerCase()
  const catFilter = catSel.value
  const covFilter = covSel.value

  // Build header
  headEl.innerHTML = ''
  const headRow = el('tr')
  headRow.appendChild(el('th', { class: 'matrix-th-elem' }, '国标要素'))
  for (const d of docs) {
    const th = el('th', { class: 'matrix-th-doc', title: d.odc.function_name })
    th.appendChild(el('a', { href: `/view.html?id=${encodeURIComponent(d.odc.id)}` }, [
      el('div', { class: 'th-vendor' }, d.odc.vendor),
      el('div', { class: 'th-model' }, d.odc.model),
      el('div', { class: 'th-lvl' }, adsLevelLabel(d.odc.ads_level))
    ]))
    headRow.appendChild(th)
  }
  headEl.appendChild(headRow)

  // Build body
  bodyEl.innerHTML = ''
  const elements = allElements()
  let rowCount = 0
  let currentCat = null

  for (const elem of elements) {
    if (catFilter && elem.topCategoryId !== catFilter) continue
    if (q) {
      const hay = (elem.name_zh + ' ' + elem.id + ' ' + (elem.description_zh || '')).toLowerCase()
      if (!hay.includes(q)) continue
    }
    if (covFilter === 'substantive') {
      // Every doc has gap/structural for this element → skip
      const allEmpty = docs.every(d => {
        const e = d.elementMap.get(elem.id)
        if (!e) return true
        const cov = classifyCoverage(e.description, e.parameter_range)
        return cov === 'gap' || cov === 'structural'
      })
      if (allEmpty) continue
    }
    if (covFilter === 'divergent') {
      if (!isDivergent(elem.id)) continue
    }

    // Insert category header row when topCategory changes
    if (currentCat !== elem.topCategoryName) {
      currentCat = elem.topCategoryName
      const catRow = el('tr', { class: 'matrix-cat-row' })
      catRow.appendChild(el('td', { class: 'matrix-cat-label', colspan: String(docs.length + 1) }, currentCat))
      bodyEl.appendChild(catRow)
    }

    const tr = el('tr')
    const leftTd = el('td', { class: 'matrix-elem' })
    leftTd.appendChild(el('div', { class: 'elem-name' }, elem.name_zh))
    leftTd.appendChild(el('div', { class: 'elem-meta' }, [
      el('code', { class: 'elem-id' }, elem.id),
      el('span', { class: 'elem-sec' }, ' · §' + elem.spec_section)
    ]))
    tr.appendChild(leftTd)
    for (const d of docs) {
      const e = d.elementMap.get(elem.id)
      const td = el('td', { class: 'matrix-cell ' + requirementClass(e), title: cellTooltip(e) })
      td.appendChild(el('span', { class: 'cell-dot' }))
      const rangeOrDesc = e?.parameter_range || (e?.description && !e.description.includes('[') ? e.description : '')
      if (rangeOrDesc) td.appendChild(el('span', { class: 'cell-text' }, rangeOrDesc.slice(0, 50) + (rangeOrDesc.length > 50 ? '…' : '')))
      else td.appendChild(el('span', { class: 'cell-lbl' }, cellLabel(e)))
      tr.appendChild(td)
    }
    bodyEl.appendChild(tr)
    rowCount++
  }

  countEl.textContent = `${rowCount} 个要素 · ${docs.length} 个样例`
}

;(async () => {
  try {
    catalog = await loadCatalog()
    elementIndex = buildElementIndex(catalog)
    const manifest = await loadManifest()

    // Populate category filter
    for (const cat of catalog.categories) {
      const opt = document.createElement('option')
      opt.value = cat.category_id
      opt.textContent = cat.name_zh
      catSel.appendChild(opt)
    }

    // Load all docs (limit to ~10 for layout sanity)
    const fetched = await Promise.all(manifest.documents.map(m => loadDocument(m.file).then(odc => ({
      manifestEntry: m,
      odc,
      elementMap: new Map((odc.elements || []).map(e => [e.element_id, e]))
    }))))
    docs = fetched.sort((a, b) => a.odc.ads_level - b.odc.ads_level)

    render()
    catSel.addEventListener('change', render)
    covSel.addEventListener('change', render)
    searchInput.addEventListener('input', render)
  } catch (e) {
    bodyEl.innerHTML = `<tr><td class="error">加载失败：${e.message}</td></tr>`
  }
})()
