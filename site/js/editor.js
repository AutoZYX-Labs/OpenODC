import {
  loadCatalog, loadDocument, loadManifest,
  buildElementIndex,
  requirementLabel, exitBehaviorLabel, adsLevelLabel, reviewStatusLabel,
  lang, elementName, categoryName,
  el, downloadBlob, getQueryParam
} from './common.js'

const STORAGE_KEY = 'openodc-editor-draft-v1'

let catalog = null
let elementIndex = null

const copy = {
  zh: {
    noMatch: '没有匹配元素',
    noSelected: '还没有声明任何元素。从左侧层级树中点击元素加入。',
    description: '说明',
    optional: '可选',
    parameterRange: '参数范围',
    parameterExample: '如：曲率半径 ≥ 150 m',
    exitBehavior: '退出行为',
    confirmClear: '确认清空当前编辑内容？',
    saved: '已保存到浏览器本地存储。',
    noDraft: '没有本地保存的草稿',
    copied: '已复制到剪贴板',
    notWorkbench: '非工作台会话',
    unnamed: '（未命名）',
    prCopied: filename => `JSON 已复制到剪贴板。即将打开 GitHub 新建文件页（文件名已预填 ${filename}）。\n\n步骤：\n1. 粘贴内容（Ctrl/Cmd + V）\n2. 底部 Commit 消息填 "Add ODC record"\n3. 选 "Create new branch for this commit and start a pull request"\n4. 点击 Commit changes`,
    copyFailed: '复制失败；请使用“下载 JSON”然后手动上传',
    mdLabels: {
      level: '自动化等级',
      software: '软件版本',
      effective: '生效日期',
      standard: '标准依据',
      status: '审核状态',
      count: n => `共 ${n} 项 ODC 元素。`
    },
    loadedDraft: name => `已加载工作台草稿「${name}」。保存后将覆盖该条本地草稿。`,
    loadedSample: doc => `已从样例库加载「${doc.vendor} · ${doc.function_name}」作为起点`,
    fromWorkbench: '从厂家工作台进入。已预填厂家 / 车型 / 功能名；请在左侧层级树勾选 ODC 要素。',
    backWorkbench: '← 返回工作台',
    loadFailed: msg => `加载失败：${msg}`
  },
  en: {
    noMatch: 'No matching elements',
    noSelected: 'No elements declared yet. Select elements from the taxonomy tree.',
    description: 'Description',
    optional: 'Optional',
    parameterRange: 'Parameter range',
    parameterExample: 'e.g. curve radius ≥ 150 m',
    exitBehavior: 'Exit behavior',
    confirmClear: 'Clear the current draft?',
    saved: 'Saved to browser local storage.',
    noDraft: 'No locally saved draft',
    copied: 'Copied to clipboard',
    notWorkbench: 'Not a workbench session',
    unnamed: '(untitled)',
    prCopied: filename => `JSON copied to clipboard. A GitHub new-file page will open with filename ${filename}.\n\nSteps:\n1. Paste the JSON content\n2. Use a commit message such as "Add ODC record"\n3. Select "Create a new branch for this commit and start a pull request"\n4. Click Commit changes`,
    copyFailed: 'Copy failed; download the JSON and upload it manually',
    mdLabels: {
      level: 'Automation level',
      software: 'Software version',
      effective: 'Effective date',
      standard: 'Standard',
      status: 'Review status',
      count: n => `${n} ODC elements.`
    },
    loadedDraft: name => `Loaded workbench draft “${name}”. Saving will overwrite this local draft.`,
    loadedSample: doc => `Loaded “${doc.vendor_en || doc.vendor} · ${doc.function_name_en || doc.function_name}” from the gallery as a starting point.`,
    fromWorkbench: 'Opened from the vendor workbench. Vendor, model, and feature metadata are prefilled; select ODC elements from the taxonomy tree.',
    backWorkbench: '← Back to Workbench',
    loadFailed: msg => `Load failed: ${msg}`
  }
}

const state = {
  meta: {
    vendor: '', vendor_en: '', model: '', model_en: '',
    function_name: '', function_name_en: '',
    ads_level: 2, software_version: '', hardware_config: '',
    effective_date: new Date().toISOString().slice(0, 10),
    submitted_by: '', review_status: 'draft', sources: ''
  },
  elements: new Map() // element_id -> { requirement, description, parameter_range, exit_behavior }
}

const treeContainer = document.getElementById('catalog-tree')
const treeSearch = document.getElementById('tree-search')
const selectedList = document.getElementById('selected-list')
const selectedCount = document.getElementById('selected-count')
const jsonPreview = document.getElementById('json-preview')

function bindMetaInputs() {
  const map = {
    'm-vendor': 'vendor', 'm-vendor_en': 'vendor_en',
    'm-model': 'model', 'm-model_en': 'model_en',
    'm-function_name': 'function_name', 'm-function_name_en': 'function_name_en',
    'm-ads_level': 'ads_level', 'm-software_version': 'software_version',
    'm-hardware_config': 'hardware_config', 'm-effective_date': 'effective_date',
    'm-submitted_by': 'submitted_by', 'm-review_status': 'review_status',
    'm-sources': 'sources'
  }
  for (const [domId, stateKey] of Object.entries(map)) {
    const el = document.getElementById(domId)
    el.value = state.meta[stateKey] ?? ''
    el.addEventListener('input', () => {
      state.meta[stateKey] = el.value
      renderPreview()
    })
  }
}

function renderTree(filter = '') {
  treeContainer.innerHTML = ''
  const q = filter.trim().toLowerCase()
  for (const cat of catalog.categories) {
    const catNode = el('div', { class: 'tree-cat' })
    catNode.appendChild(el('h4', { class: 'tree-cat-title' }, categoryName(cat) + ' · §' + cat.spec_section))

    // Build a sub-tree for this category by parent_id relationships
    const byParent = new Map()
    for (const e of cat.elements) {
      const pid = e.parent_id || cat.category_id
      if (!byParent.has(pid)) byParent.set(pid, [])
      byParent.get(pid).push(e)
    }
    const ul = renderSubTree(cat.category_id, byParent, q, cat)
    if (ul && (!q || ul.children.length > 0)) {
      catNode.appendChild(ul)
      treeContainer.appendChild(catNode)
    }
  }
  if (treeContainer.children.length === 0) {
    treeContainer.appendChild(el('p', { class: 'empty-hint' }, copy[lang].noMatch))
  }
}

function renderSubTree(parentId, byParent, q, cat) {
  const children = byParent.get(parentId) || []
  if (children.length === 0) return null
  const ul = el('ul', { class: 'tree-list' })
  for (const child of children) {
    const matches = !q || (child.name_zh || '').toLowerCase().includes(q) || (child.name_en || '').toLowerCase().includes(q) || child.id.toLowerCase().includes(q)
    const subUl = renderSubTree(child.id, byParent, q, cat)
    if (!matches && (!subUl || subUl.children.length === 0)) continue
    const li = el('li', { class: 'tree-item' })
    const isSelected = state.elements.has(child.id)
    const isLeaf = !byParent.has(child.id)
    const label = el('span', {
      class: 'tree-label' + (isSelected ? ' is-selected' : '') + (isLeaf ? ' is-leaf' : ''),
      onclick: () => {
        if (isSelected) {
          state.elements.delete(child.id)
        } else {
          state.elements.set(child.id, {
            requirement: 'permitted',
            description: '',
            parameter_range: '',
            exit_behavior: null
          })
        }
        renderTree(treeSearch.value)
        renderSelected()
        renderPreview()
      }
    }, [
      el('span', { class: 'tree-marker' }, isSelected ? '✓' : '+'),
      el('span', { class: 'tree-name' }, elementName(child)),
      el('span', { class: 'tree-section' }, '§' + child.spec_section)
    ])
    li.appendChild(label)
    if (subUl) li.appendChild(subUl)
    ul.appendChild(li)
  }
  return ul
}

function renderSelected() {
  selectedCount.textContent = String(state.elements.size)
  selectedList.innerHTML = ''
  if (state.elements.size === 0) {
    selectedList.appendChild(el('p', { class: 'empty-hint' }, copy[lang].noSelected))
    return
  }
  // Group by category
  const groups = new Map()
  for (const [id, val] of state.elements) {
    const meta = elementIndex.get(id)
    if (!meta) continue
    const key = meta.category_id
    if (!groups.has(key)) groups.set(key, { name: categoryName(meta), items: [] })
    groups.get(key).items.push({ id, meta, val })
  }
  for (const [_, g] of groups) {
    selectedList.appendChild(el('h4', { class: 'sel-cat-title' }, g.name))
    for (const item of g.items) {
      selectedList.appendChild(renderSelectedItem(item))
    }
  }
}

function renderSelectedItem({ id, meta, val }) {
  const card = el('div', { class: 'sel-item req-' + val.requirement })
  card.appendChild(el('div', { class: 'sel-item-header' }, [
    el('span', { class: 'sel-item-name' }, elementName(meta)),
    el('span', { class: 'sel-item-section' }, '§' + meta.spec_section),
    el('button', { class: 'sel-item-remove', onclick: () => {
      state.elements.delete(id)
      renderTree(treeSearch.value)
      renderSelected()
      renderPreview()
    } }, '×')
  ]))
  const reqRow = el('div', { class: 'sel-item-row' })
  for (const r of ['permitted', 'not_permitted']) {
    const radioId = `req-${id}-${r}`
    const wrapper = el('label', { class: 'req-radio req-radio-' + r + (val.requirement === r ? ' active' : '') })
    const input = el('input', { type: 'radio', name: `req-${id}`, value: r, id: radioId })
    if (val.requirement === r) input.checked = true
    input.addEventListener('change', () => {
      val.requirement = r
      if (r === 'permitted') val.exit_behavior = null
      else if (!val.exit_behavior) val.exit_behavior = 'suppress_and_exit'
      renderSelected()
      renderPreview()
    })
    wrapper.appendChild(input)
    wrapper.appendChild(document.createTextNode(requirementLabel(r, lang)))
    reqRow.appendChild(wrapper)
  }
  card.appendChild(reqRow)

  // Description
  const descLabel = el('label', { class: 'sel-field' })
  descLabel.appendChild(el('span', {}, copy[lang].description))
  const descriptionPlaceholder = lang === 'zh' && meta.description_zh ? meta.description_zh.slice(0, 60) : copy[lang].optional
  const descInput = el('input', { type: 'text', value: val.description, placeholder: descriptionPlaceholder })
  descInput.addEventListener('input', () => { val.description = descInput.value; renderPreview() })
  descLabel.appendChild(descInput)
  card.appendChild(descLabel)

  // Parameter range (only if permitted)
  if (val.requirement === 'permitted') {
    const paramLabel = el('label', { class: 'sel-field' })
    paramLabel.appendChild(el('span', {}, copy[lang].parameterRange))
    const placeholder = lang === 'zh' && meta.requirement_template ? meta.requirement_template.slice(0, 60) : copy[lang].parameterExample
    const paramInput = el('input', { type: 'text', value: val.parameter_range, placeholder })
    paramInput.addEventListener('input', () => { val.parameter_range = paramInput.value; renderPreview() })
    paramLabel.appendChild(paramInput)
    card.appendChild(paramLabel)
  }

  // Exit behavior (only if not_permitted)
  if (val.requirement === 'not_permitted') {
    const exitLabel = el('label', { class: 'sel-field' })
    exitLabel.appendChild(el('span', {}, copy[lang].exitBehavior))
    const exitSelect = el('select', {})
    for (const opt of ['suppress_activation', 'trigger_exit', 'suppress_and_exit']) {
      const o = el('option', { value: opt }, exitBehaviorLabel(opt, lang))
      if (val.exit_behavior === opt) o.selected = true
      exitSelect.appendChild(o)
    }
    exitSelect.addEventListener('change', () => { val.exit_behavior = exitSelect.value; renderPreview() })
    exitLabel.appendChild(exitSelect)
    card.appendChild(exitLabel)
  }

  return card
}

function buildDocument() {
  const id = (state.meta.vendor + '-' + state.meta.model + '-' + state.meta.function_name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-odc'
  return {
    id,
    spec_version: '0.1.0',
    spec_source: 'GB/T 45312-2025',
    vendor: state.meta.vendor,
    vendor_en: state.meta.vendor_en || undefined,
    model: state.meta.model,
    model_en: state.meta.model_en || undefined,
    function_name: state.meta.function_name,
    function_name_en: state.meta.function_name_en || undefined,
    ads_level: parseInt(state.meta.ads_level, 10),
    software_version: state.meta.software_version || null,
    hardware_config: state.meta.hardware_config || null,
    effective_date: state.meta.effective_date,
    elements: [...state.elements].map(([element_id, v]) => {
      const out = { element_id, requirement: v.requirement }
      if (v.description) out.description = v.description
      if (v.parameter_range) out.parameter_range = v.parameter_range
      if (v.requirement === 'not_permitted' && v.exit_behavior) out.exit_behavior = v.exit_behavior
      return out
    }),
    metadata: {
      submitted_by: state.meta.submitted_by || 'unknown',
      submitted_at: new Date().toISOString(),
      review_status: state.meta.review_status,
      sources: state.meta.sources ? state.meta.sources.split('\n').map(s => s.trim()).filter(Boolean) : []
    }
  }
}

function renderPreview() {
  jsonPreview.textContent = JSON.stringify(buildDocument(), null, 2)
}

function bindToolbar() {
  document.getElementById('t-load-example').addEventListener('click', async () => {
    const doc = await loadDocument('data/examples/huawei-ads4-aito-m9.json')
    importFromDoc(doc)
  })
  document.getElementById('t-clear').addEventListener('click', () => {
    if (!confirm(copy[lang].confirmClear)) return
    state.elements.clear()
    for (const k of Object.keys(state.meta)) state.meta[k] = (k === 'ads_level' ? 2 : (k === 'review_status' ? 'draft' : (k === 'effective_date' ? new Date().toISOString().slice(0, 10) : '')))
    bindMetaInputs() // re-sync DOM
    renderTree(treeSearch.value)
    renderSelected()
    renderPreview()
  })
  document.getElementById('t-save-local').addEventListener('click', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      meta: state.meta,
      elements: [...state.elements]
    }))
    alert(copy[lang].saved)
  })
  document.getElementById('t-load-local').addEventListener('click', () => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) { alert(copy[lang].noDraft); return }
    const data = JSON.parse(raw)
    state.meta = data.meta
    state.elements = new Map(data.elements)
    bindMetaInputs()
    renderTree(treeSearch.value)
    renderSelected()
    renderPreview()
  })
  document.getElementById('t-download-json').addEventListener('click', () => {
    const doc = buildDocument()
    downloadBlob(JSON.stringify(doc, null, 2), `${doc.id}.json`, 'application/json')
  })
  document.getElementById('t-download-md').addEventListener('click', () => {
    const doc = buildDocument()
    downloadBlob(toMarkdownSummary(doc), `${doc.id}.md`, 'text/markdown')
  })
  document.getElementById('t-copy-json').addEventListener('click', async () => {
    const doc = buildDocument()
    await navigator.clipboard.writeText(JSON.stringify(doc, null, 2))
    alert(copy[lang].copied)
  })
  document.getElementById('t-save-workbench').addEventListener('click', saveToWorkbench)
  document.getElementById('t-open-pr').addEventListener('click', openPR)
  treeSearch.addEventListener('input', () => renderTree(treeSearch.value))
}

const WORKBENCH_KEY = 'openodc.workbench.v2'

function getWorkbenchFunction(vendorId, functionId) {
  if (!vendorId || !functionId) return null
  try {
    const raw = localStorage.getItem(WORKBENCH_KEY)
    const workbench = raw ? JSON.parse(raw) : {}
    const vendor = workbench[vendorId]
    if (!vendor || !Array.isArray(vendor.functions)) return null
    return vendor.functions.find(f => f.id === functionId) || null
  } catch {
    return null
  }
}

function saveToWorkbench() {
  const wbVendor = getQueryParam('workbench_vendor')
  const wbFn = getQueryParam('workbench_fn')
  if (!wbVendor || !wbFn) { alert(copy[lang].notWorkbench); return }
  const raw = localStorage.getItem(WORKBENCH_KEY)
  const state = raw ? JSON.parse(raw) : {}
  if (!state[wbVendor]) state[wbVendor] = { functions: [] }
  const doc = buildDocument()
  const fnIndex = state[wbVendor].functions.findIndex(f => f.id === wbFn)
  if (fnIndex < 0) {
    state[wbVendor].functions.push({
      id: wbFn,
      name: doc.function_name || copy[lang].unnamed,
      model: doc.model || '',
      ads_level: doc.ads_level || 2,
      status: 'in_development',
      updated_at: new Date().toISOString(),
      manual_url: '',
      notes: '',
      odc_draft: doc
    })
  } else {
    state[wbVendor].functions[fnIndex] = {
      ...state[wbVendor].functions[fnIndex],
      name: doc.function_name || state[wbVendor].functions[fnIndex].name,
      model: doc.model || state[wbVendor].functions[fnIndex].model,
      ads_level: doc.ads_level || state[wbVendor].functions[fnIndex].ads_level,
      updated_at: new Date().toISOString(),
      odc_draft: doc
    }
  }
  localStorage.setItem(WORKBENCH_KEY, JSON.stringify(state))
  window.location.href = '/workbench.html'
}

function openPR() {
  const doc = buildDocument()
  const json = JSON.stringify(doc, null, 2)
  const filename = doc.id + '.json'
  // GitHub's new-file URL supports ?filename= but ?value= is limited in URL length.
  // Strategy: copy JSON to clipboard + open the new-file page; user pastes.
  navigator.clipboard.writeText(json).then(() => {
    const url = `https://github.com/AutoZYX-Labs/OpenODC/new/main/data/examples?filename=${encodeURIComponent(filename)}`
    alert(copy[lang].prCopied(filename))
    window.open(url, '_blank', 'noopener')
  }).catch(() => {
    alert(copy[lang].copyFailed)
  })
}

function importFromDoc(doc) {
  state.meta.vendor = doc.vendor || ''
  state.meta.vendor_en = doc.vendor_en || ''
  state.meta.model = doc.model || ''
  state.meta.model_en = doc.model_en || ''
  state.meta.function_name = doc.function_name || ''
  state.meta.function_name_en = doc.function_name_en || ''
  state.meta.ads_level = doc.ads_level ?? 2
  state.meta.software_version = doc.software_version || ''
  state.meta.hardware_config = doc.hardware_config || ''
  state.meta.effective_date = doc.effective_date || new Date().toISOString().slice(0, 10)
  state.meta.submitted_by = doc.metadata?.submitted_by || ''
  state.meta.review_status = doc.metadata?.review_status || 'draft'
  state.meta.sources = (doc.metadata?.sources || []).join('\n')
  state.elements.clear()
  for (const e of doc.elements || []) {
    state.elements.set(e.element_id, {
      requirement: e.requirement,
      description: e.description || '',
      parameter_range: e.parameter_range || '',
      exit_behavior: e.exit_behavior || null
    })
  }
  bindMetaInputs()
  renderTree(treeSearch.value)
  renderSelected()
  renderPreview()
}

function toMarkdownSummary(doc) {
  let md = `# ${doc.vendor} ${doc.model} — ${doc.function_name}\n\n`
  md += `- ${copy[lang].mdLabels.level}: ${adsLevelLabel(doc.ads_level)}\n`
  md += `- ${copy[lang].mdLabels.software}: ${doc.software_version || '—'}\n`
  md += `- ${copy[lang].mdLabels.effective}: ${doc.effective_date}\n`
  md += `- ${copy[lang].mdLabels.standard}: ${doc.spec_source}\n`
  md += `- ${copy[lang].mdLabels.status}: ${reviewStatusLabel(doc.metadata.review_status, lang)}\n\n`
  md += `${copy[lang].mdLabels.count(doc.elements.length)}\n`
  return md
}

async function maybeLoadFromQuery() {
  const wbVendor = getQueryParam('workbench_vendor')
  const wbFn = getQueryParam('workbench_fn')
  const workbenchFn = getWorkbenchFunction(wbVendor, wbFn)

  if (workbenchFn?.odc_draft) {
    importFromDoc(workbenchFn.odc_draft)
    showWorkbenchBanner(copy[lang].loadedDraft(workbenchFn.name || workbenchFn.odc_draft.function_name || copy[lang].unnamed), wbVendor, wbFn)
    return true
  }

  const loadId = getQueryParam('load')
  if (loadId) {
    try {
      const manifest = await loadManifest()
      const entry = manifest.documents.find(d => d.id === loadId)
      if (!entry) { console.warn('load id not found:', loadId); return false }
      const doc = await loadDocument(entry.file)
      importFromDoc(doc)
      showWorkbenchBanner(copy[lang].loadedSample(doc), wbVendor, wbFn)
      return true
    } catch (e) { console.warn('load failed:', e); return false }
  }

  if (wbVendor && wbFn) {
    // Prefill blank editor with workbench function metadata
    state.meta.vendor = decodeURIComponent(getQueryParam('wb_vendor_name') || '')
    state.meta.function_name = decodeURIComponent(getQueryParam('wb_fn_name') || workbenchFn?.name || '')
    state.meta.model = decodeURIComponent(getQueryParam('wb_model') || workbenchFn?.model || '')
    const lvl = getQueryParam('wb_level')
    if (lvl || workbenchFn?.ads_level) state.meta.ads_level = parseInt(lvl || workbenchFn.ads_level, 10) || 2
    showWorkbenchBanner(copy[lang].fromWorkbench, wbVendor, wbFn)
    return true
  }
  return false
}

function showWorkbenchBanner(msg, vendor, fn) {
  const banner = el('div', { class: 'editor-workbench-banner' }, [
    el('span', { class: 'wb-dot' }, '●'),
    el('span', { class: 'wb-msg' }, msg),
    vendor && fn ? el('a', { class: 'wb-back', href: lang === 'en' ? '/en/workbench.html' : '/workbench.html' }, copy[lang].backWorkbench) : null
  ])
  const main = document.querySelector('main')
  if (main) main.insertBefore(banner, main.firstChild)
  // Reveal workbench-scoped toolbar buttons
  for (const id of ['t-save-workbench', 't-open-pr', 't-workbench-spacer']) {
    const btn = document.getElementById(id)
    if (btn) btn.hidden = false
  }
}

;(async () => {
  try {
    catalog = await loadCatalog()
    elementIndex = buildElementIndex(catalog)
    bindMetaInputs()
    await maybeLoadFromQuery()
    renderTree('')
    renderSelected()
    renderPreview()
    bindToolbar()
  } catch (e) {
    treeContainer.innerHTML = `<p class="error">${copy[lang].loadFailed(e.message)}</p>`
  }
})()
