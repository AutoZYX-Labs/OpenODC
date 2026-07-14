import { buildElementIndex, downloadBlob, el, loadCatalog } from './common.js'
import { buildExportPayload, buildExportRecords, exportRecordsToCsv, exportRecordsToMarkdown } from './road-rule-export.js'

const lang = document.documentElement.lang === 'en' ? 'en' : 'zh'
const basePath = lang === 'en' ? '/en/road-rules.html' : '/road-rules.html'

const copy = {
  zh: {
    categories: {
      traffic_signal: '交通信号',
      road_traffic: '道路通行',
      vehicle_operation: '车辆操作',
      priority_interaction: '优先权与交互',
      special_risk: '特殊与风险处置'
    },
    categoryAll: '全部类别',
    sourceAll: '全部来源',
    result: (shown, total) => `显示 ${shown} / ${total} 条义务`,
    summary: (shown, sourceCount) => `${shown} 条可追溯义务 · ${sourceCount} 个现行公开来源`,
    reviewed: '人工复核已记录',
    normativeRule: '公开规则',
    legalSubject: '法律义务主体',
    engineeringLayer: '工程映射层级',
    derivation: {
      engineering_interpretation: '工程解释',
      engineering_candidate: '工程候选'
    },
    applicability: '适用条件',
    trigger: '场景触发点',
    response: '期望响应',
    trace: '查看完整追溯链',
    sources: '来源与条款',
    mappings: 'ODC 语义映射',
    scenarioEvidence: '候选验证证据',
    sourceLink: '查看公开原文',
    relation: { direct: '直接映射', contextual: '语义映射', supporting: '支撑要素' },
    evidence: {
      requirements_trace: '需求追溯',
      model_or_code_review: '模型 / 代码审查',
      simulation: '模拟仿真',
      proving_ground: '封闭场地',
      road_test: '实际道路',
      event_log: '事件日志',
      human_review: '人工复核'
    },
    noResults: '当前条件下没有可追溯义务。',
    clear: '清空筛选',
    elementFilter: 'ODC 要素筛选',
    removeElement: '移除要素筛选',
    loadError: message => `道路规则数据加载失败：${message}`,
    exportEmpty: '当前没有可导出的结果。'
  },
  en: {
    categories: {
      traffic_signal: 'Traffic signals',
      road_traffic: 'Road traffic',
      vehicle_operation: 'Vehicle operation',
      priority_interaction: 'Priority & interaction',
      special_risk: 'Special & risk handling'
    },
    categoryAll: 'All categories',
    sourceAll: 'All sources',
    result: (shown, total) => `Showing ${shown} of ${total} obligations`,
    summary: (shown, sourceCount) => `${shown} traceable obligations · ${sourceCount} current public sources`,
    reviewed: 'Manual review recorded',
    normativeRule: 'Public rule',
    legalSubject: 'Legal subject',
    engineeringLayer: 'Engineering layer',
    derivation: {
      engineering_interpretation: 'Engineering interpretation',
      engineering_candidate: 'Engineering candidate'
    },
    applicability: 'Applicability',
    trigger: 'Scenario trigger',
    response: 'Expected response',
    trace: 'Open the full traceability chain',
    sources: 'Sources and clauses',
    mappings: 'ODC semantic mapping',
    scenarioEvidence: 'Candidate verification evidence',
    sourceLink: 'Open public source',
    relation: { direct: 'Direct mapping', contextual: 'Semantic mapping', supporting: 'Supporting element' },
    evidence: {
      requirements_trace: 'Requirements trace',
      model_or_code_review: 'Model / code review',
      simulation: 'Simulation',
      proving_ground: 'Proving ground',
      road_test: 'Road test',
      event_log: 'Event log',
      human_review: 'Human review'
    },
    noResults: 'No traceable obligation matches the current filters.',
    clear: 'Clear filters',
    elementFilter: 'ODC element filter',
    removeElement: 'Remove element filter',
    loadError: message => `Failed to load road-rule data: ${message}`,
    exportEmpty: 'There are no results to export.'
  }
}[lang]

const searchInput = document.getElementById('rule-search')
const categorySelect = document.getElementById('rule-category')
const sourceSelect = document.getElementById('rule-source')
const resetButton = document.getElementById('rule-reset')
const countEl = document.getElementById('rule-count')
const summaryEl = document.getElementById('rule-result-summary')
const listEl = document.getElementById('rule-list')
const activeFilterEl = document.getElementById('active-rule-filter')

let profile = null
let elementIndex = new Map()
let filtered = []

function localize(value) {
  return value?.[lang] || value?.zh || value?.en || ''
}

function currentFilters() {
  const params = new URLSearchParams(window.location.search)
  return {
    q: searchInput.value.trim(),
    category: categorySelect.value,
    source: sourceSelect.value,
    element: params.get('element') || ''
  }
}

function hydrateFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search)
  searchInput.value = params.get('q') || ''
  categorySelect.value = params.get('category') || ''
  sourceSelect.value = params.get('source') || ''
}

function syncUrl(filters) {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.category) params.set('category', filters.category)
  if (filters.source) params.set('source', filters.source)
  if (filters.element) params.set('element', filters.element)
  const query = params.toString()
  window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
}

function searchableText(obligation) {
  const sourceMap = new Map(profile.sources.map(source => [source.id, source]))
  return [
    obligation.id,
    obligation.title.zh,
    obligation.title.en,
    obligation.summary.zh,
    obligation.summary.en,
    ...obligation.source_refs.flatMap(sourceRef => {
      const source = sourceMap.get(sourceRef.source_id)
      return [sourceRef.source_id, ...sourceRef.clauses, source?.title?.zh, source?.title?.en]
    }),
    ...obligation.odc_mappings.flatMap(item => {
      const meta = elementIndex.get(item.element_id)
      return [item.element_id, meta?.name_zh, meta?.name_en]
    })
  ].filter(Boolean).join(' ').toLowerCase()
}

function applyFilters({ updateUrl = true } = {}) {
  const filters = currentFilters()
  const query = filters.q.toLowerCase()
  filtered = profile.obligations.filter(obligation => {
    if (filters.category && obligation.category !== filters.category) return false
    if (filters.source && !obligation.source_refs.some(item => item.source_id === filters.source)) return false
    if (filters.element && !obligation.odc_mappings.some(item => item.element_id === filters.element)) return false
    return !query || searchableText(obligation).includes(query)
  })
  if (updateUrl) syncUrl(filters)
  renderActiveElementFilter(filters.element)
  renderList()
}

function renderActiveElementFilter(elementId) {
  activeFilterEl.innerHTML = ''
  if (!elementId) {
    activeFilterEl.hidden = true
    return
  }
  const meta = elementIndex.get(elementId)
  const label = lang === 'en' ? (meta?.name_en || meta?.name_zh || elementId) : (meta?.name_zh || meta?.name_en || elementId)
  const button = el('button', { type: 'button', title: copy.removeElement }, '×')
  button.addEventListener('click', () => {
    const params = new URLSearchParams(window.location.search)
    params.delete('element')
    window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? `?${params}` : ''}`)
    applyFilters()
  })
  activeFilterEl.append(
    el('span', {}, `${copy.elementFilter}: `),
    el('code', {}, `${label} · ${elementId}`),
    button
  )
  activeFilterEl.hidden = false
}

function renderList() {
  countEl.textContent = copy.result(filtered.length, profile.obligations.length)
  const usedSources = new Set(filtered.flatMap(item => item.source_refs.map(sourceRef => sourceRef.source_id)))
  summaryEl.textContent = copy.summary(filtered.length, usedSources.size)
  listEl.innerHTML = ''
  if (!filtered.length) {
    const empty = el('div', { class: 'rule-empty' }, [
      el('p', {}, copy.noResults),
      el('button', { class: 'btn-link', type: 'button', onClick: resetFilters }, copy.clear)
    ])
    listEl.appendChild(empty)
    return
  }
  for (const obligation of filtered) listEl.appendChild(renderObligation(obligation))
}

function renderObligation(obligation) {
  const card = el('article', {
    class: 'obligation-card',
    id: obligation.id,
    'data-rule-id': obligation.id
  })
  const head = el('div', { class: 'obligation-card-head' }, [
    el('span', { class: 'obligation-number' }, String(obligation.order).padStart(2, '0')),
    el('span', { class: 'rule-category-pill' }, copy.categories[obligation.category]),
    el('span', { class: 'rule-review-pill' }, copy.reviewed)
  ])
  card.append(
    head,
    el('h2', {}, localize(obligation.title)),
    el('p', { class: 'obligation-summary' }, localize(obligation.summary)),
    el('section', { class: 'normative-rule-block' }, [
      el('span', {}, copy.normativeRule),
      el('p', {}, localize(obligation.normative_rule))
    ]),
    el('div', { class: 'rule-boundary-strip' }, [
      el('section', {}, [
        el('span', {}, copy.legalSubject),
        el('strong', {}, localize(obligation.normative_subject.label)),
        el('small', {}, localize(obligation.normative_subject.legal_boundary))
      ]),
      el('section', {}, [
        el('span', {}, copy.engineeringLayer),
        el('strong', {}, copy.derivation[obligation.derivation.type]),
        el('small', {}, localize(obligation.derivation.statement))
      ])
    ])
  )

  const condition = obligation.applicability[0]
  const hook = obligation.scenario_hooks[0]
  card.appendChild(el('div', { class: 'rule-field-grid' }, [
    fieldBlock(copy.applicability, localize(condition.condition)),
    fieldBlock(copy.trigger, localize(hook.trigger)),
    fieldBlock(copy.response, localize(hook.expected_response))
  ]))

  const details = el('details', { class: 'trace-details' })
  details.appendChild(el('summary', {}, copy.trace))
  const body = el('div', { class: 'trace-body' })
  body.append(
    renderSourceTrace(obligation),
    renderMappingTrace(obligation),
    renderEvidenceTrace(hook)
  )
  details.appendChild(body)
  card.appendChild(details)
  return card
}

function fieldBlock(label, value) {
  return el('section', {}, [el('h3', {}, label), el('p', {}, value)])
}

function renderSourceTrace(obligation) {
  const sourceMap = new Map(profile.sources.map(source => [source.id, source]))
  const section = el('section', { class: 'trace-section' }, [el('h3', {}, copy.sources)])
  const list = el('div', { class: 'trace-source-list' })
  for (const sourceRef of obligation.source_refs) {
    const source = sourceMap.get(sourceRef.source_id)
    if (!source) continue
    const item = el('div', { class: 'trace-source-item' }, [
      el('div', { class: 'trace-source-head' }, [
        el('strong', {}, localize(source.title)),
        el('span', {}, sourceRef.clauses.join(' · '))
      ]),
      el('small', { class: 'trace-source-meta' }, `${localize(source.authority)} · ${source.checked_on} · SHA-256 ${source.version_evidence.reference_fingerprint_sha256.slice(0, 12)}…`),
      el('p', {}, localize(sourceRef.interpretation)),
      el('a', { href: source.url, target: '_blank', rel: 'noopener' }, `${copy.sourceLink} ↗`)
    ])
    list.appendChild(item)
  }
  section.appendChild(list)
  return section
}

function renderMappingTrace(obligation) {
  const section = el('section', { class: 'trace-section' }, [el('h3', {}, copy.mappings)])
  const list = el('div', { class: 'mapping-list' })
  for (const item of obligation.odc_mappings) {
    const meta = elementIndex.get(item.element_id)
    const name = lang === 'en' ? (meta?.name_en || meta?.name_zh || item.element_id) : (meta?.name_zh || meta?.name_en || item.element_id)
    const link = el('a', {
      class: 'dimension-chip',
      href: `${basePath}?element=${encodeURIComponent(item.element_id)}`,
      title: item.element_id
    }, [
      el('span', {}, copy.relation[item.relation]),
      el('strong', {}, name),
      el('code', {}, item.element_id)
    ])
    list.appendChild(el('div', { class: 'mapping-row' }, [
      link,
      el('p', {}, localize(item.rationale))
    ]))
  }
  section.appendChild(list)
  return section
}

function renderEvidenceTrace(hook) {
  const section = el('section', { class: 'trace-section' }, [el('h3', {}, copy.scenarioEvidence)])
  const chips = el('div', { class: 'evidence-candidate-list' })
  for (const evidence of hook.evidence_candidates) {
    chips.appendChild(el('span', {}, copy.evidence[evidence] || evidence))
  }
  section.appendChild(chips)
  return section
}

function resetFilters() {
  searchInput.value = ''
  categorySelect.value = ''
  sourceSelect.value = ''
  window.history.replaceState({}, '', window.location.pathname)
  applyFilters()
}

function scrollToHashTarget() {
  if (!window.location.hash) return
  const id = decodeURIComponent(window.location.hash.slice(1))
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'start' })
    })
  })
}

function exportCurrent(format) {
  if (!filtered.length) {
    window.alert(copy.exportEmpty)
    return
  }
  const filters = currentFilters()
  const filename = `openodc-road-rules-${lang}`
  const records = buildExportRecords(profile, filtered)
  if (format === 'json') {
    const payload = buildExportPayload(profile, filtered, filters)
    downloadBlob(JSON.stringify(payload, null, 2), `${filename}.json`, 'application/json')
  } else if (format === 'csv') {
    downloadBlob(exportRecordsToCsv(records), `${filename}.csv`, 'text/csv;charset=utf-8')
  } else {
    downloadBlob(exportRecordsToMarkdown(profile, records, lang, copy.categories, copy.derivation), `${filename}.md`, 'text/markdown;charset=utf-8')
  }
}

async function init() {
  try {
    const [profileResponse, catalog] = await Promise.all([
      fetch('/data/road-rules/obligations.json'),
      loadCatalog()
    ])
    if (!profileResponse.ok) throw new Error(`HTTP ${profileResponse.status}`)
    profile = await profileResponse.json()
    elementIndex = buildElementIndex(catalog)

    for (const [value, label] of Object.entries(copy.categories)) {
      categorySelect.appendChild(el('option', { value }, label))
    }
    for (const source of profile.sources) {
      sourceSelect.appendChild(el('option', { value: source.id }, localize(source.title)))
    }
    categorySelect.firstElementChild.textContent = copy.categoryAll
    sourceSelect.firstElementChild.textContent = copy.sourceAll
    hydrateFiltersFromUrl()
    applyFilters({ updateUrl: false })
    scrollToHashTarget()

    searchInput.addEventListener('input', () => applyFilters())
    categorySelect.addEventListener('change', () => applyFilters())
    sourceSelect.addEventListener('change', () => applyFilters())
    resetButton.addEventListener('click', resetFilters)
    document.querySelectorAll('[data-export]').forEach(button => {
      button.addEventListener('click', () => {
        exportCurrent(button.dataset.export)
        button.closest('details')?.removeAttribute('open')
      })
    })
    window.addEventListener('popstate', () => {
      hydrateFiltersFromUrl()
      applyFilters({ updateUrl: false })
      scrollToHashTarget()
    })
    window.addEventListener('hashchange', scrollToHashTarget)
  } catch (error) {
    listEl.innerHTML = ''
    listEl.appendChild(el('p', { class: 'error' }, copy.loadError(error.message)))
    countEl.textContent = '—'
  }
}

init()
