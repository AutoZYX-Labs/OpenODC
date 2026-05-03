import {
  loadCatalog, buildElementIndex,
  lang, elementName, categoryName,
  el, downloadBlob
} from './common.js'

// workbench.js — browser-local intake tool for turning source material into an ODC draft table.

const STORAGE_KEY = 'openodc.intake.v1'
let catalog = null
let elementIndex = null
let latestRows = []

const copy = {
  zh: {
    fileRecorded: name => `已记录文件名：${name}。公开页面不会上传或解析文件。`,
    fileDefault: '公开页面仅记录文件名，不上传或解析文件内容。',
    needText: '请先粘贴手册、规则或脱敏摘录。仅填写 URL 时，当前静态页面无法抓取网页正文。',
    generated: (matched, total) => `已生成 ${total} 个标准要素，其中 ${matched} 项从导入资料中识别到证据。`,
    copied: 'Markdown 表格已复制到剪贴板。',
    copyFailed: '复制失败，请使用下载 CSV。',
    matched: '已识别',
    gaps: '待补证据',
    structural: '结构性要素',
    total: '标准要素',
    category: '类别',
    element: 'ODC 要素',
    status: '状态',
    parameter: '参数 / 证据',
    action: '确认动作',
    noEvidence: '导入资料中未识别到直接证据。',
    structuralEvidence: '层级结构项，实际声明通常落在子要素。',
    confirmPublish: '厂家确认可公开字段与证据位置',
    addEvidence: '补充手册页码、阈值或明确说明',
    reviewStructural: '检查子要素即可',
    permitted: '允许',
    notPermitted: '不允许',
    unspecified: '资料未明确',
    extracted: '从导入资料中识别',
    source: '来源',
    sampleOrg: '示例 OEM',
    sampleFeature: '高速 NOA',
    sampleModel: '2026 款车型',
    sampleDomain: 'safety@example-oem.com',
    sampleUrl: 'https://example-oem.com/owner-manual.pdf',
    sampleText: '该高速 NOA 功能仅适用于高速公路和城市快速路，车速范围 0–130 km/h。驾驶员必须始终保持注意力并准备接管。遇到大雨、降雪、浓雾、能见度不足、施工区域、事故现场、无清晰车道线、交通管制、隧道、环岛、行人或非机动车混行场景，系统可能抑制激活或提示接管退出。功能依赖定位信号、车道线和交通标志识别，夜间需要道路照明或车辆前照灯条件满足。'
  },
  en: {
    fileRecorded: name => `Filename recorded: ${name}. The public page does not upload or parse files.`,
    fileDefault: 'The public page records the filename only; it does not upload or parse the file.',
    needText: 'Paste a manual, operating rule, or sanitized excerpt first. The static page cannot fetch webpage body text from a URL alone.',
    generated: (matched, total) => `Generated ${total} standard elements; ${matched} elements include evidence recognized from the imported text.`,
    copied: 'Markdown table copied to clipboard.',
    copyFailed: 'Copy failed. Use Download CSV instead.',
    matched: 'Matched',
    gaps: 'Evidence gaps',
    structural: 'Structural',
    total: 'Standard elements',
    category: 'Category',
    element: 'ODC Element',
    status: 'Status',
    parameter: 'Parameter / Evidence',
    action: 'Review Action',
    noEvidence: 'No direct evidence recognized in the imported material.',
    structuralEvidence: 'Hierarchy node; substantive declarations usually belong to child elements.',
    confirmPublish: 'Vendor confirms public fields and evidence locations',
    addEvidence: 'Add manual page, threshold, or explicit statement',
    reviewStructural: 'Review child elements',
    permitted: 'Permitted',
    notPermitted: 'Not permitted',
    unspecified: 'Unspecified',
    extracted: 'Recognized from imported text',
    source: 'Source',
    sampleOrg: 'Example OEM',
    sampleFeature: 'Highway NOA',
    sampleModel: '2026 vehicle model',
    sampleDomain: 'safety@example-oem.com',
    sampleUrl: 'https://example-oem.com/owner-manual.pdf',
    sampleText: 'This Highway NOA feature is only available on highways and urban expressways, with a speed range of 0–130 km/h. The driver must remain attentive and be ready to take over at all times. Heavy rain, snowfall, dense fog, low visibility, construction zones, accident scenes, unclear lane markings, traffic control, tunnels, roundabouts, pedestrians, and mixed non-motorized traffic may suppress activation or trigger takeover and exit. The feature depends on positioning signals, lane marking recognition, and traffic sign recognition; nighttime operation requires sufficient street lighting or vehicle headlights.'
  }
}

const RULES = [
  {
    id: 'odd.road.type.highway.expressway',
    keywords: ['高速公路', '高速', 'highway', 'expressway', 'freeway'],
    parameter: { zh: '高速公路', en: 'Highway / expressway' },
    requirement: 'permitted'
  },
  {
    id: 'odd.road.type.urban_road.expressway',
    keywords: ['城市快速路', '快速路', 'urban expressway'],
    parameter: { zh: '城市快速路', en: 'Urban expressway' },
    requirement: 'permitted'
  },
  {
    id: 'vehicle.motion.speed.operating',
    keywords: ['车速', '速度', '限速', 'speed', 'km/h', 'mph'],
    parameter: { zh: '提取运行速度范围', en: 'Extract operating speed range' },
    requirement: 'permitted'
  },
  {
    id: 'personnel.driver.takeover.attention',
    keywords: ['驾驶员', '注意力', '接管', '保持注意', 'take over', 'takeover', 'attentive', 'supervise', 'driver'],
    parameter: { zh: '驾驶员持续监管 / 可接管', en: 'Driver supervision / takeover readiness' },
    requirement: 'permitted'
  },
  {
    id: 'odd.weather.atmospheric.rain',
    keywords: ['雨', '降雨', '大雨', '暴雨', 'rain', 'rainfall', 'heavy rain'],
    parameter: { zh: '需补充降雨量阈值', en: 'Rainfall threshold requires confirmation' }
  },
  {
    id: 'odd.weather.atmospheric.snow.snowfall',
    keywords: ['雪', '降雪', 'snow', 'snowfall'],
    parameter: { zh: '需补充降雪等级或积雪条件', en: 'Snowfall / snow accumulation threshold requires confirmation' }
  },
  {
    id: 'odd.weather.particles.fog',
    keywords: ['雾', '浓雾', '能见度', 'fog', 'visibility', 'dense fog'],
    parameter: { zh: '需补充能见度阈值', en: 'Visibility threshold requires confirmation' }
  },
  {
    id: 'odd.infrastructure.temporary.construction',
    keywords: ['施工', '施工区域', 'construction', 'work zone', 'roadworks'],
    parameter: { zh: '施工区域需确认退出或抑制激活', en: 'Construction zone behavior requires confirmation' },
    requirement: 'not_permitted'
  },
  {
    id: 'odd.infrastructure.temporary.accident_site',
    keywords: ['事故现场', '事故', 'accident scene', 'crash scene'],
    parameter: { zh: '事故现场需确认退出或抑制激活', en: 'Accident-scene behavior requires confirmation' },
    requirement: 'not_permitted'
  },
  {
    id: 'odd.infrastructure.temporary.traffic_control',
    keywords: ['交通管制', '临时管制', 'traffic control', 'temporary traffic control'],
    parameter: { zh: '临时交通管制', en: 'Temporary traffic control' }
  },
  {
    id: 'odd.road.lane.marking.quality',
    keywords: ['车道线', '标线', 'lane marking', 'lane markings', 'clear lane'],
    parameter: { zh: '车道线清晰度', en: 'Lane marking quality' },
    requirement: 'permitted'
  },
  {
    id: 'odd.road.lane.marking.absent',
    keywords: ['无清晰车道线', '无车道线', '缺失车道线', 'missing lane markings', 'unclear lane markings'],
    parameter: { zh: '无清晰车道线', en: 'Missing / unclear lane markings' },
    requirement: 'not_permitted'
  },
  {
    id: 'odd.infrastructure.special.tunnel',
    keywords: ['隧道', 'tunnel'],
    parameter: { zh: '隧道场景', en: 'Tunnel scenario' }
  },
  {
    id: 'odd.road.intersection.roundabout.normal',
    keywords: ['环岛', 'roundabout'],
    parameter: { zh: '环岛场景', en: 'Roundabout scenario' }
  },
  {
    id: 'odd.targets.pedestrian',
    keywords: ['行人', 'pedestrian'],
    parameter: { zh: '行人目标物', en: 'Pedestrians' }
  },
  {
    id: 'odd.targets.non_motor_vehicle',
    keywords: ['非机动车', '电动自行车', '自行车', 'non-motorized', 'cyclist', 'bicycle'],
    parameter: { zh: '非机动车目标物', en: 'Non-motorized vehicles' }
  },
  {
    id: 'odd.infrastructure.traffic_control.sign',
    keywords: ['交通标志', '交通标识', 'traffic sign', 'road sign'],
    parameter: { zh: '交通标志识别', en: 'Traffic sign recognition' },
    requirement: 'permitted'
  },
  {
    id: 'odd.infrastructure.traffic_control.signal',
    keywords: ['交通信号灯', '红绿灯', 'traffic light', 'traffic signal'],
    parameter: { zh: '交通信号灯识别', en: 'Traffic signal recognition' },
    requirement: 'permitted'
  },
  {
    id: 'odd.weather.lighting.streetlight',
    keywords: ['道路照明', '路灯', 'street lighting', 'streetlight'],
    parameter: { zh: '道路照明条件', en: 'Street lighting condition' },
    requirement: 'permitted'
  },
  {
    id: 'odd.weather.lighting.headlight',
    keywords: ['前照灯', '大灯', 'headlight', 'headlights'],
    parameter: { zh: '车辆前照灯条件', en: 'Vehicle headlight condition' },
    requirement: 'permitted'
  },
  {
    id: 'odd.digital.position',
    keywords: ['定位', '定位信号', 'gps', 'gnss', 'positioning'],
    parameter: { zh: '定位信号可用', en: 'Positioning signal available' },
    requirement: 'permitted'
  }
]

const NEGATIVE_TERMS = [
  '不支持', '不可', '不能', '无法', '退出', '接管', '受限', '抑制', '禁止',
  'not available', 'unavailable', 'not supported', 'exit', 'take over',
  'takeover', 'suppress', 'limit', 'limited', 'disable', 'disabled'
]

async function init() {
  catalog = await loadCatalog()
  elementIndex = buildElementIndex(catalog)
  bindInputs()
  restoreDraft()
}

function bindInputs() {
  const fileInput = document.getElementById('intake-file')
  const fileHint = document.getElementById('file-hint')
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0]
    fileHint.textContent = file ? copy[lang].fileRecorded(file.name) : copy[lang].fileDefault
    saveDraft()
  })

  for (const id of ['intake-org', 'intake-feature', 'intake-model', 'intake-level', 'intake-domain', 'intake-source-url', 'intake-text']) {
    document.getElementById(id)?.addEventListener('input', saveDraft)
  }

  document.getElementById('fill-sample')?.addEventListener('click', fillSample)
  document.getElementById('generate-table')?.addEventListener('click', generateDraft)
  document.getElementById('copy-markdown')?.addEventListener('click', copyMarkdown)
  document.getElementById('download-csv')?.addEventListener('click', downloadCsv)
}

function fillSample() {
  setValue('intake-org', copy[lang].sampleOrg)
  setValue('intake-feature', copy[lang].sampleFeature)
  setValue('intake-model', copy[lang].sampleModel)
  setValue('intake-domain', copy[lang].sampleDomain)
  setValue('intake-source-url', copy[lang].sampleUrl)
  setValue('intake-text', copy[lang].sampleText)
  saveDraft()
  generateDraft()
}

function setValue(id, value) {
  const node = document.getElementById(id)
  if (node) node.value = value
}

function getValue(id) {
  return document.getElementById(id)?.value?.trim() || ''
}

function saveDraft() {
  const draft = collectMetadata()
  draft.text = getValue('intake-text')
  const file = document.getElementById('intake-file')?.files?.[0]
  if (file) draft.file_name = file.name
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
}

function restoreDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const draft = JSON.parse(raw)
    for (const [id, key] of Object.entries(inputMap())) {
      const node = document.getElementById(id)
      if (node && draft[key]) node.value = draft[key]
    }
    if (draft.text) setValue('intake-text', draft.text)
    if (draft.file_name) {
      const fileHint = document.getElementById('file-hint')
      if (fileHint) fileHint.textContent = copy[lang].fileRecorded(draft.file_name)
    }
  } catch {}
}

function inputMap() {
  return {
    'intake-org': 'organization',
    'intake-feature': 'feature',
    'intake-model': 'model',
    'intake-level': 'level',
    'intake-domain': 'domain',
    'intake-source-url': 'source_url'
  }
}

function collectMetadata() {
  return {
    organization: getValue('intake-org'),
    feature: getValue('intake-feature'),
    model: getValue('intake-model'),
    level: getValue('intake-level') || '2',
    domain: getValue('intake-domain'),
    source_url: getValue('intake-source-url')
  }
}

function generateDraft() {
  const text = getValue('intake-text')
  if (!text) {
    alert(copy[lang].needText)
    return
  }
  saveDraft()
  latestRows = buildRows(text, collectMetadata())
  renderResults(latestRows)
  setExportsEnabled(true)
}

function buildRows(text, metadata) {
  const matches = new Map()
  for (const rule of RULES) {
    const evidence = findEvidence(text, rule.keywords)
    if (!evidence) continue
    const requirement = rule.requirement || (isNegativeEvidence(evidence) ? 'not_permitted' : 'permitted')
    matches.set(rule.id, {
      requirement,
      parameter: extractParameter(evidence) || localized(rule.parameter),
      evidence,
      source: metadata.source_url || '',
      action: copy[lang].confirmPublish,
      matched: true
    })
  }

  const childIds = new Set()
  for (const cat of catalog.categories) {
    for (const item of cat.elements) {
      if (item.parent_id) childIds.add(item.parent_id)
    }
  }

  const rows = []
  for (const cat of catalog.categories) {
    for (const item of cat.elements) {
      const matched = matches.get(item.id)
      const isStructural = !matched && (childIds.has(item.id) || item.level <= 3)
      rows.push({
        id: item.id,
        category: categoryName(cat),
        element: elementName(item),
        requirement: matched?.requirement || (isStructural ? 'structural' : 'gap'),
        parameter: matched?.parameter || '',
        evidence: matched?.evidence || (isStructural ? copy[lang].structuralEvidence : copy[lang].noEvidence),
        source: matched?.source || '',
        action: matched?.action || (isStructural ? copy[lang].reviewStructural : copy[lang].addEvidence),
        matched: Boolean(matched),
        structural: isStructural
      })
    }
  }
  return rows
}

function localized(value) {
  if (!value) return ''
  return value[lang] || value.zh || value.en || ''
}

function findEvidence(text, keywords) {
  const sentences = text
    .replace(/\r/g, '\n')
    .split(/(?<=[。！？.!?])\s+|[。！？!?]\s*|\n+/)
    .map(s => s.trim())
    .filter(Boolean)
  const lowerSentences = sentences.map(s => s.toLowerCase())
  for (let i = 0; i < sentences.length; i++) {
    if (keywords.some(k => lowerSentences[i].includes(k.toLowerCase()))) return sentences[i]
  }
  return ''
}

function isNegativeEvidence(sentence) {
  const lower = sentence.toLowerCase()
  return NEGATIVE_TERMS.some(term => lower.includes(term.toLowerCase()))
}

function extractParameter(sentence) {
  const range = sentence.match(/\d+(?:\.\d+)?\s*[–~\-至到]\s*\d+(?:\.\d+)?\s*(?:km\/h|公里\/小时|mph|m\/s|mm\/h|mm|m|米|℃|°C|%)/i)
  if (range) return range[0]
  const values = sentence.match(/\d+(?:\.\d+)?\s*(?:km\/h|公里\/小时|mph|m\/s|mm\/h|mm|m|米|℃|°C|%)/gi)
  return values ? values.slice(0, 3).join(' / ') : ''
}

function renderResults(rows) {
  const root = document.getElementById('workbench-results')
  root.innerHTML = ''
  const matched = rows.filter(r => r.matched).length
  const structural = rows.filter(r => r.requirement === 'structural').length
  const gaps = rows.length - matched - structural

  root.appendChild(el('div', { class: 'intake-result-summary' }, [
    statCard(copy[lang].matched, matched),
    statCard(copy[lang].gaps, gaps),
    statCard(copy[lang].structural, structural),
    statCard(copy[lang].total, rows.length)
  ]))

  root.appendChild(el('p', { class: 'source-status' }, copy[lang].generated(matched, rows.length)))

  const table = el('table', { class: 'intake-table' })
  table.appendChild(el('thead', {}, el('tr', {}, [
    el('th', {}, copy[lang].category),
    el('th', {}, copy[lang].element),
    el('th', {}, copy[lang].status),
    el('th', {}, copy[lang].parameter),
    el('th', {}, copy[lang].action)
  ])))
  const tbody = el('tbody')
  for (const row of rows) tbody.appendChild(renderRow(row))
  table.appendChild(tbody)
  root.appendChild(el('div', { class: 'intake-table-wrap' }, table))
}

function statCard(label, value) {
  return el('div', { class: 'intake-stat-card' }, [
    el('strong', {}, String(value)),
    el('span', {}, label)
  ])
}

function renderRow(row) {
  const tr = el('tr', { class: `intake-row intake-${row.requirement}` })
  tr.appendChild(el('td', {}, row.category))
  tr.appendChild(el('td', {}, [
    el('div', { class: 'intake-element-name' }, row.element),
    el('code', {}, row.id)
  ]))
  tr.appendChild(el('td', {}, statusLabel(row.requirement)))
  const evidenceChildren = []
  if (row.parameter) evidenceChildren.push(el('div', { class: 'intake-parameter' }, row.parameter))
  evidenceChildren.push(el('div', { class: 'intake-evidence' }, row.evidence))
  if (row.source) evidenceChildren.push(el('a', { href: row.source, target: '_blank', rel: 'noopener' }, copy[lang].source))
  tr.appendChild(el('td', {}, evidenceChildren))
  tr.appendChild(el('td', {}, row.action))
  return tr
}

function statusLabel(status) {
  const map = {
    permitted: copy[lang].permitted,
    not_permitted: copy[lang].notPermitted,
    gap: copy[lang].unspecified,
    structural: copy[lang].structural
  }
  return map[status] || status
}

async function copyMarkdown() {
  if (!latestRows.length) return
  try {
    await navigator.clipboard.writeText(toMarkdown(latestRows))
    alert(copy[lang].copied)
  } catch {
    alert(copy[lang].copyFailed)
  }
}

function downloadCsv() {
  if (!latestRows.length) return
  const csv = toCsv(latestRows)
  downloadBlob(csv, 'openodc-intake-draft.csv', 'text/csv;charset=utf-8')
}

function setExportsEnabled(enabled) {
  document.getElementById('copy-markdown').disabled = !enabled
  document.getElementById('download-csv').disabled = !enabled
}

function toMarkdown(rows) {
  const meta = collectMetadata()
  const header = [
    `# OpenODC Intake Draft — ${meta.organization || 'Organization'} / ${meta.feature || 'Feature'}`,
    '',
    `- ADS level: L${meta.level}`,
    `- Model / scenario: ${meta.model || '—'}`,
    `- Submitter domain: ${meta.domain || '—'}`,
    `- Source URL: ${meta.source_url || '—'}`,
    '',
    `| ${copy[lang].category} | ${copy[lang].element} | ${copy[lang].status} | ${copy[lang].parameter} | ${copy[lang].action} |`,
    '|---|---|---|---|---|'
  ]
  const body = rows.map(r => `| ${esc(r.category)} | ${esc(r.element)} | ${esc(statusLabel(r.requirement))} | ${esc([r.parameter, r.evidence].filter(Boolean).join(' — '))} | ${esc(r.action)} |`)
  return header.concat(body).join('\n')
}

function toCsv(rows) {
  const header = ['element_id', 'category', 'element', 'status', 'parameter', 'evidence', 'source', 'review_action']
  const body = rows.map(r => [r.id, r.category, r.element, statusLabel(r.requirement), r.parameter, r.evidence, r.source, r.action])
  return [header, ...body].map(cols => cols.map(csvCell).join(',')).join('\n')
}

function csvCell(value) {
  return `"${String(value || '').replaceAll('"', '""')}"`
}

function esc(value) {
  return String(value || '').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim()
}

init().catch(err => {
  const root = document.getElementById('workbench-results')
  if (root) root.innerHTML = `<p class="error">${err.message}</p>`
})
