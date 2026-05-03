import {
  loadCatalog, loadManifest, loadDocument,
  buildElementIndex, groupByCategory,
  adsLevelLabel, reviewStatusLabel, requirementLabel, exitBehaviorLabel,
  lang, docVendor, docModel, docFunctionName, elementName, categoryName, localizeEvidenceText,
  el, downloadBlob, getQueryParam
} from './common.js'

const titleEl = document.getElementById('doc-title')
const subtitleEl = document.getElementById('doc-subtitle')
const badgesEl = document.getElementById('doc-badges')
const containerEl = document.getElementById('view-container')

let currentDoc = null
let currentIndex = null
let currentCatalog = null
let currentView = getQueryParam('view') || 'dev'

const copy = {
  zh: {
    element: '元素 (章节)',
    requirement: '要求',
    description: '说明 / 参数',
    exitBehavior: '退出行为',
    associations: '元素关联关系',
    rawJson: '查看完整 JSON 原文',
    consumerIntro: '面向普通用户：这份样例把公开资料里的运行边界翻译成可核验清单。每条都标注标准章节号，可对照 GB/T 45312—2025 核验。',
    noConsumerData: '暂无足够数据生成消费者视图。',
    coverageHead: total => `公开资料对 GB/T 45312—2025 全部 ${total} 个国标要素的覆盖情况：`,
    manualOfficial: n => `官方/手册 ${n}`,
    community: n => `社区整理 ${n}`,
    inferred: n => `推定 ${n}`,
    gap: n => `公开资料未明确 ${n}`,
    structural: n => `结构 ${n}`,
    coverageNote: '公开资料未明确的数量本身就是数据：它显示了公开边界说明相对国标要素的缺口。',
    exitsTitle: n => `重点风险：这 ${n} 种情况可能导致抑制激活、降级或退出`,
    unknownTitle: '公开资料未明确',
    unknownHint: '公开资料没有直接说明这些国标要素，不能推定为允许、禁止或系统可处理。',
    items: n => `${n} 项`,
    none: '（无）',
    coverageTags: {
      gap: '公开资料未明确',
      structural: '结构性',
      manual: '手册明确',
      official: '官方声明',
      inferred: '推定',
      curated: '社区整理'
    },
    standard: '标准',
    sourceFallback: '来源',
    page: page => `页码/位置 ${page}`,
    sourcesTitle: '数据来源与核验指引',
    statusText: {
      draft: '本 ODC 为社区基于公开资料（用户手册、运营规则、政府公告、官方页面、第三方测评）提取的草稿，不代表厂家官方声明。请以厂家官方资料和实际 App / 车机提示为准。',
      community_reviewed: '本 ODC 已经过社区同行评审，但仍不等同于厂家官方声明。',
      vendor_confirmed: '本 ODC 已由厂家官方确认。'
    },
    evidenceAsOf: d => `证据核验日期：${d}。功能 OTA 或运营规则更新后，需要重新核验。`,
    sourcesIntro: '引用资料：',
    evidenceBadge: d => `证据核验 ${d}`,
    copyDone: '已复制到剪贴板',
    missingId: '缺少 ?id 参数。',
    backGallery: '返回样例库',
    sampleNotFound: id => `未找到样例：${id}`,
    loadFailed: msg => `加载失败：${msg}`
  },
  en: {
    element: 'Element (section)',
    requirement: 'Requirement',
    description: 'Description / parameter',
    exitBehavior: 'Exit behavior',
    associations: 'Element Associations',
    rawJson: 'Show raw JSON',
    consumerIntro: 'Plain-language view: this sample turns publicly available operating-boundary evidence into a verifiable checklist. Each item keeps the GB/T 45312—2025 section number for traceability.',
    noConsumerData: 'Not enough data to render a consumer view.',
    coverageHead: total => `Coverage of all ${total} GB/T 45312—2025 ODC elements by public evidence:`,
    manualOfficial: n => `Official/manual ${n}`,
    community: n => `Community ${n}`,
    inferred: n => `Inferred ${n}`,
    gap: n => `Unspecified ${n}`,
    structural: n => `Structural ${n}`,
    coverageNote: 'Unspecified items are still data: they show where public boundary descriptions do not yet cover the national-standard element set.',
    exitsTitle: n => `Key risk: ${n} conditions may suppress activation, degrade operation, or trigger exit`,
    unknownTitle: 'Not specified in public sources',
    unknownHint: 'Public sources do not directly cover these standard elements; they should not be inferred as allowed, prohibited, or handled by the system.',
    items: n => `${n} items`,
    none: '(none)',
    coverageTags: {
      gap: 'Unspecified',
      structural: 'Structural',
      manual: 'Manual-backed',
      official: 'Official statement',
      inferred: 'Inferred',
      curated: 'Community extraction'
    },
    standard: 'Standard',
    sourceFallback: 'Source',
    page: page => `page/location ${page}`,
    sourcesTitle: 'Sources and verification guidance',
    statusText: {
      draft: 'This ODC is a community draft extracted from public manuals, operating rules, government notices, official pages, and third-party tests. It is not a vendor official declaration. Always defer to official vendor material and in-vehicle or app prompts.',
      community_reviewed: 'This ODC has received community review, but it is still not equivalent to a vendor official declaration.',
      vendor_confirmed: 'This ODC has been confirmed by the vendor.'
    },
    evidenceAsOf: d => `Evidence checked as of ${d}. OTA changes or operating-rule updates require re-verification.`,
    sourcesIntro: 'Sources:',
    evidenceBadge: d => `Evidence checked ${d}`,
    copyDone: 'Copied to clipboard',
    missingId: 'Missing ?id parameter.',
    backGallery: 'Back to gallery',
    sampleNotFound: id => `Sample not found: ${id}`,
    loadFailed: msg => `Load failed: ${msg}`
  }
}

function setView(name) {
  currentView = name
  document.querySelectorAll('.view-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.view === name)
  })
  const url = new URL(window.location)
  url.searchParams.set('view', name)
  window.history.replaceState(null, '', url)
  renderCurrent()
}

function renderCurrent() {
  if (!currentDoc) return
  containerEl.innerHTML = ''
  switch (currentView) {
    case 'dev': renderDev(); break
    case 'consumer': renderConsumer(); break
    default: renderDev()
  }
}

// ---- Developer view: full hierarchy + JSON ----
function renderDev() {
  const groups = groupByCategory(currentDoc, currentIndex)
  const wrap = el('div', { class: 'dev-view' })

  for (const [catId, group] of groups) {
    const section = el('div', { class: 'cat-block' })
    section.appendChild(el('h2', { class: 'cat-title' }, categoryName(group)))
    const table = el('table', { class: 'odc-table' })
    table.appendChild(el('thead', {}, el('tr', {}, [
      el('th', {}, copy[lang].element),
      el('th', {}, copy[lang].requirement),
      el('th', {}, copy[lang].description),
      el('th', {}, copy[lang].exitBehavior)
    ])))
    const tbody = el('tbody')
    for (const e of group.elements) {
      const meta = e._meta
      const row = el('tr', { class: 'req-' + e.requirement })
      row.appendChild(el('td', {}, [
        el('div', { class: 'el-name' }, elementName(meta)),
        el('div', { class: 'el-section' }, '§' + meta.spec_section + (meta.spec_reference ? ' · ' + meta.spec_reference : ''))
      ]))
      row.appendChild(el('td', { class: 'req-cell' }, requirementLabel(e.requirement, lang)))
      const desc = localizeEvidenceText(e.description || meta.description_en || meta.description_zh || '')
      row.appendChild(el('td', {}, [
        el('div', {}, desc),
        e.parameter_range ? el('div', { class: 'param-range' }, e.parameter_range) : null,
        renderEvidenceInline(e)
      ]))
      row.appendChild(el('td', { class: 'exit-cell' }, exitBehaviorLabel(e.exit_behavior, lang)))
      tbody.appendChild(row)
    }
    table.appendChild(tbody)
    section.appendChild(table)
    wrap.appendChild(section)
  }

  if (currentDoc.associations && currentDoc.associations.length) {
    const ass = el('div', { class: 'cat-block' })
    ass.appendChild(el('h2', { class: 'cat-title' }, copy[lang].associations))
    const list = el('ul', { class: 'assoc-list' })
    for (const a of currentDoc.associations) {
      const primary = elementName(currentIndex.get(a.primary_id) || { id: a.primary_id })
      const dependent = elementName(currentIndex.get(a.dependent_id) || { id: a.dependent_id })
      list.appendChild(el('li', {}, `${primary} → ${dependent}：${a.description}`))
    }
    ass.appendChild(list)
    wrap.appendChild(ass)
  }

  // JSON dump
  const jsonBlock = el('details', { class: 'json-details' })
  jsonBlock.appendChild(el('summary', {}, copy[lang].rawJson))
  const pre = el('pre', { class: 'json-dump' })
  pre.textContent = JSON.stringify(currentDoc, null, 2)
  jsonBlock.appendChild(pre)
  wrap.appendChild(jsonBlock)

  containerEl.appendChild(wrap)
}

// ---- Consumer view: plain-language, grouped, verifiable ----
function renderConsumer() {
  const wrap = el('div', { class: 'consumer-view' })
  wrap.appendChild(el('p', { class: 'view-intro' }, copy[lang].consumerIntro))
  wrap.appendChild(renderTrustBanner(currentDoc))

  const buckets = bucketizeForConsumer(currentDoc)
  if (buckets.useable.length === 0 && buckets.limited.length === 0 && buckets.unusable.length === 0 && buckets.unknown.length === 0) {
    wrap.appendChild(el('p', {}, copy[lang].noConsumerData))
    containerEl.appendChild(wrap)
    return
  }

  wrap.appendChild(el('div', { class: 'consumer-summary' }, generateOneLineSummary(currentDoc, buckets)))

  const stats = coverageStats(currentDoc)
  const coverageStrip = el('div', { class: 'coverage-strip' })
  coverageStrip.appendChild(el('div', { class: 'coverage-strip-head' }, copy[lang].coverageHead(stats.total)))
  const bar = el('div', { class: 'coverage-bar' })
  const direct = stats.manual + stats.official
  const community = stats.curated
  const inferred = stats.inferred, gap = stats.gap, structural = stats.structural
  if (direct) bar.appendChild(el('span', { class: 'seg seg-manual', style: `flex:${direct}` }, copy[lang].manualOfficial(direct)))
  if (community) bar.appendChild(el('span', { class: 'seg seg-community', style: `flex:${community}` }, copy[lang].community(community)))
  if (inferred) bar.appendChild(el('span', { class: 'seg seg-inferred', style: `flex:${inferred}` }, copy[lang].inferred(inferred)))
  if (gap) bar.appendChild(el('span', { class: 'seg seg-gap', style: `flex:${gap}` }, copy[lang].gap(gap)))
  if (structural) bar.appendChild(el('span', { class: 'seg seg-structural', style: `flex:${structural}` }, copy[lang].structural(structural)))
  coverageStrip.appendChild(bar)
  coverageStrip.appendChild(el('p', { class: 'coverage-strip-note' }, copy[lang].coverageNote))
  wrap.appendChild(coverageStrip)

  if (buckets.exits.length) {
    const exits = el('div', { class: 'consumer-exits' })
    exits.appendChild(el('h3', {}, copy[lang].exitsTitle(buckets.exits.length)))
    const list = el('ul')
    for (const e of buckets.exits) list.appendChild(el('li', {}, e.label))
    exits.appendChild(list)
    wrap.appendChild(exits)
  }

  const bucketCopy = consumerBucketCopy(currentDoc)
  wrap.appendChild(renderBucket('green', bucketCopy.greenTitle, buckets.useable, bucketCopy.greenHint))
  wrap.appendChild(renderBucket('amber', bucketCopy.amberTitle, buckets.limited, bucketCopy.amberHint))
  wrap.appendChild(renderBucket('red', bucketCopy.redTitle, buckets.unusable, bucketCopy.redHint))
  wrap.appendChild(renderBucket('unknown', copy[lang].unknownTitle, buckets.unknown, copy[lang].unknownHint))

  wrap.appendChild(renderSourcesFooter(currentDoc))
  containerEl.appendChild(wrap)
}

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

function renderTrustBanner(doc) {
  const level = Number(doc.ads_level)
  const title = lang === 'en'
    ? (level <= 2
        ? 'L2 assistance sample: the driver remains responsible'
        : level === 3
          ? 'L3 ADS sample: ODC is the boundary for automated DDT performance'
          : 'L4 ADS / robotaxi sample: ODC is close to the service operating boundary')
    : (level <= 2
        ? 'L2 辅助驾驶样例：驾驶员仍需持续监管'
        : level === 3
          ? 'L3 ADS 样例：ODC 是系统承担动态驾驶任务的前提边界'
          : 'L4 ADS / Robotaxi 样例：ODC 更接近服务运营边界')
  const body = lang === 'en'
    ? (level <= 2
        ? 'This sample describes publicly extractable use conditions and limitations. It does not mean the vehicle can operate without driver supervision and it is not a safety certification.'
        : level === 3
          ? 'This sample should be read together with the operating boundary, takeover request conditions, and fallback-user responsibilities. Items not stated in public sources must not be assumed to be handled.'
          : 'This sample should be read together with geofencing, operating hours, app rules, remote-assistance policy, and local permits. Publicly undisclosed weather, speed, or remote-assistance thresholds are explicitly treated as gaps.')
    : (level <= 2
        ? '本样例描述的是公开资料中可提取的功能适用条件和限制条件，不表示车辆可以脱离驾驶员监管，也不构成安全认证。'
        : level === 3
          ? '本样例应同时理解系统运行边界、接管请求和后备用户责任；公开资料未说明的项目不得推定为系统可处理。'
          : '本样例应结合 geofence、运营时间、App 实时规则和当地监管许可理解；公开资料未披露的天气、速度或远程协助阈值会明确标为缺口。')
  const source = doc.metadata.review_status === 'vendor_confirmed'
    ? (lang === 'en' ? ' This record is marked as vendor-confirmed.' : '该记录标记为厂家确认版本。')
    : (lang === 'en' ? ' This record is a community extraction from public sources, not a vendor official ODC declaration.' : '该记录为社区基于公开资料提取的草稿或评审版本，不代表厂家官方 ODC 声明。')
  return el('div', { class: 'trust-banner' }, [
    el('h3', {}, title),
    el('p', {}, body + source)
  ])
}

function consumerBucketCopy(doc) {
  const level = Number(doc.ads_level)
  if (lang === 'en') {
    if (level <= 2) {
      return {
        greenTitle: 'Recommended Use Conditions',
        greenHint: 'Public sources indicate the assistance feature can be used under these conditions; the driver still supervises continuously.',
        amberTitle: 'Limited Conditions',
        amberHint: 'Use is bounded by explicit parameters; outside them the feature may degrade, exit, or require immediate driver intervention.',
        redTitle: 'Not Recommended / Not Allowed',
        redHint: 'Public sources explicitly exclude these conditions, or OpenODC marks them as not permitted under the standard structure.'
      }
    }
    if (level === 3) {
      return {
        greenTitle: 'Within ODC',
        greenHint: 'The ADS may perform the dynamic driving task within these declared conditions; takeover requests and fallback-user responsibilities still matter.',
        amberTitle: 'Limited Conditions',
        amberHint: 'Operation depends on explicit parameter ranges; outside them, the system may issue a takeover request or exit.',
        redTitle: 'Outside ODC / Not Allowed',
        redHint: 'Outside the declared operating boundary; ADS performance must not be assumed.'
      }
    }
    return {
      greenTitle: 'Within Service Boundary',
      greenHint: 'Public sources indicate the robotaxi or ADS service can operate under these conditions.',
      amberTitle: 'Limited Operation',
      amberHint: 'Operation is constrained by geofence, operating hours, weather, permits, or app rules.',
      redTitle: 'Outside Service Boundary',
      redHint: 'Public sources exclude these conditions or current permits do not cover them.'
    }
  }
  if (level <= 2) {
    return {
      greenTitle: '建议使用条件',
      greenHint: '公开资料显示该辅助驾驶功能可在这些条件下使用；驾驶员仍需持续监控。',
      amberTitle: '有限制条件',
      amberHint: '仅在参数范围内建议使用；超出范围可能降级、退出或要求驾驶员立即接管。',
      redTitle: '不建议 / 不应使用',
      redHint: '公开资料明确排除，或 OpenODC 按国标结构标记为不允许。'
    }
  }
  if (level === 3) {
    return {
      greenTitle: 'ODC 内允许',
      greenHint: '系统可在这些声明条件内承担动态驾驶任务；仍需关注接管请求与后备用户责任。',
      amberTitle: '有限制条件',
      amberHint: '系统运行依赖明确参数范围；超出范围可能触发接管请求或退出。',
      redTitle: 'ODC 外 / 不允许',
      redHint: '超出系统声明运行边界，不能推定 ADS 可继续承担动态驾驶任务。'
    }
  }
  return {
    greenTitle: '服务边界内',
    greenHint: '公开资料显示 Robotaxi / ADS 服务可在这些运营条件内提供。',
    amberTitle: '有限制运营',
    amberHint: '受 geofence、运营时段、天气、监管许可或 App 实时规则限制。',
    redTitle: '服务边界外',
    redHint: '公开资料明确排除，或未被当前运营许可覆盖。'
  }
}

function bucketizeForConsumer(doc) {
  const useable = [], limited = [], unusable = [], unknown = [], exits = []
  for (const e of doc.elements) {
    const meta = currentIndex.get(e.element_id)
    if (!meta) continue
    const coverage = classifyCoverage(e.description, e.parameter_range)
    const item = {
      element_id: e.element_id,
      name_zh: meta.name_zh,
      name: elementName(meta),
      category_name: categoryName(meta),
      spec_section: meta.spec_section,
      parameter_range: e.parameter_range || null,
      description: e.description || null,
      exit_behavior: e.exit_behavior || null,
      coverage,
      source: e.source || null,
      evidence_refs: e.evidence_refs || [],
      label: elementName(meta) + (e.parameter_range ? ` (${e.parameter_range})` : '')
    }
    if (coverage === 'structural') continue
    if (coverage === 'gap') {
      unknown.push(item)
      continue
    }
    if (e.requirement === 'permitted') {
      if (e.parameter_range) limited.push(item)
      else useable.push(item)
    } else {
      unusable.push(item)
      if (e.exit_behavior === 'trigger_exit' || e.exit_behavior === 'suppress_and_exit') exits.push(item)
    }
  }
  return { useable, limited, unusable, unknown, exits }
}

function generateOneLineSummary(doc, buckets) {
  const level = Number(doc.ads_level)
  if (lang === 'en') {
    const levelText = level <= 2
      ? `${adsLevelLabel(level)} driver assistance; the driver remains responsible`
      : level === 3
        ? `${adsLevelLabel(level)} conditional automation; ODC is the boundary for ADS DDT performance`
        : `${adsLevelLabel(level)} high automation / robotaxi service; ODC is the service operating boundary`
    return `${docVendor(doc)} ${docModel(doc)} “${docFunctionName(doc)}” is a ${levelText}. Public sources support ${buckets.useable.length} allowed conditions, ${buckets.limited.length} limited conditions, and ${buckets.unusable.length} explicitly not-permitted conditions; ${buckets.unknown.length} items are not specified in public sources.`
  }
  const levelText = level <= 2
    ? `${adsLevelLabel(level)} 辅助驾驶功能，驾驶员仍需持续监管`
    : level === 3
      ? `${adsLevelLabel(level)} 条件自动驾驶系统，ODC 是系统承担动态驾驶任务的前提边界`
      : `${adsLevelLabel(level)} 高度自动驾驶 / Robotaxi 服务，ODC 是服务运营边界`
  return `${docVendor(doc)} ${docModel(doc)} 的「${docFunctionName(doc)}」属于 ${levelText}。公开资料可支撑 ${buckets.useable.length} 项允许条件、${buckets.limited.length} 项限制条件，明确不允许 ${buckets.unusable.length} 项；另有 ${buckets.unknown.length} 项公开资料未明确。`
}

function renderBucket(color, heading, items, hint) {
  const section = el('div', { class: 'consumer-bucket consumer-bucket-' + color })
  section.appendChild(el('h3', { class: 'bucket-heading' }, [
    el('span', { class: 'bucket-title' }, heading),
    el('span', { class: 'bucket-count' }, ` · ${copy[lang].items(items.length)}`)
  ]))
  section.appendChild(el('p', { class: 'bucket-hint' }, hint))
  if (!items.length) {
    section.appendChild(el('p', { class: 'empty-note' }, copy[lang].none))
    return section
  }
  const byCategory = new Map()
  for (const it of items) {
    const key = it.category_name || (lang === 'en' ? 'Other' : '其他')
    if (!byCategory.has(key)) byCategory.set(key, [])
    byCategory.get(key).push(it)
  }
  for (const [catName, catItems] of byCategory) {
    const details = el('details', { class: 'consumer-group' })
    details.setAttribute('open', '')
    details.appendChild(el('summary', { class: 'group-summary' }, [
      el('span', { class: 'group-name' }, catName),
      el('span', { class: 'group-count' }, ` · ${copy[lang].items(catItems.length)}`)
    ]))
    const list = el('ul', { class: 'consumer-item-list' })
    for (const it of catItems) list.appendChild(renderConsumerItem(it))
    details.appendChild(list)
    section.appendChild(details)
  }
  return section
}

function renderConsumerItem(it) {
  const li = el('li', { class: 'consumer-item coverage-' + it.coverage })
  const head = el('div', { class: 'item-head' })
  head.appendChild(el('span', { class: 'item-name' }, it.name))
  if (it.parameter_range) head.appendChild(el('span', { class: 'item-range' }, ' — ' + it.parameter_range))
  if (it.coverage === 'gap') head.appendChild(el('span', { class: 'coverage-tag tag-gap' }, copy[lang].coverageTags.gap))
  else if (it.coverage === 'structural') head.appendChild(el('span', { class: 'coverage-tag tag-structural' }, copy[lang].coverageTags.structural))
  else if (it.coverage === 'manual') head.appendChild(el('span', { class: 'coverage-tag tag-manual' }, copy[lang].coverageTags.manual))
  else if (it.coverage === 'official') head.appendChild(el('span', { class: 'coverage-tag tag-official' }, copy[lang].coverageTags.official))
  else if (it.coverage === 'inferred') head.appendChild(el('span', { class: 'coverage-tag tag-inferred' }, copy[lang].coverageTags.inferred))
  else if (it.coverage === 'curated') head.appendChild(el('span', { class: 'coverage-tag tag-community' }, copy[lang].coverageTags.curated))
  li.appendChild(head)
  if (it.description && it.coverage !== 'gap' && it.coverage !== 'structural') {
    li.appendChild(el('div', { class: 'item-desc' }, localizeEvidenceText(it.description)))
  }
  const evidence = renderEvidenceInline(it)
  if (evidence) li.appendChild(evidence)
  if (it.exit_behavior) li.appendChild(el('div', { class: 'item-exit' }, `${copy[lang].exitBehavior}: ${exitBehaviorLabel(it.exit_behavior, lang)}`))
  li.appendChild(el('div', { class: 'item-meta' }, [
    el('code', { class: 'item-id' }, it.element_id),
    el('span', { class: 'item-section' }, ` · ${copy[lang].standard} §${it.spec_section}`)
  ]))
  return li
}

function evidenceTypeLabel(type) {
  const labels = {
    zh: {
      official: '官方',
      owner_manual: '车主/用户手册',
      operating_rule: '运营规则',
      government_notice: '政府文件',
      media_test: '媒体测评',
      third_party_test: '第三方测试',
      regulatory_filing: '监管备案',
      academic: '学术资料',
      community_extracted: '社区整理',
      inferred: '推定'
    },
    en: {
      official: 'Official',
      owner_manual: 'Owner / user manual',
      operating_rule: 'Operating rule',
      government_notice: 'Government notice',
      media_test: 'Media test',
      third_party_test: 'Third-party test',
      regulatory_filing: 'Regulatory filing',
      academic: 'Academic source',
      community_extracted: 'Community extraction',
      inferred: 'Inferred'
    }
  }
  return labels[lang][type] || type || copy[lang].sourceFallback
}

function evidenceConfidenceLabel(confidence) {
  const labels = {
    zh: { high: '高置信', medium: '中置信', low: '低置信' },
    en: { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' }
  }
  return labels[lang][confidence] || confidence || ''
}

function renderEvidenceInline(item) {
  const refs = item.evidence_refs || []
  if (!refs.length && !item.source) return null
  const wrap = el('div', { class: 'evidence-inline' })
  const src = refs[0] || item.source
  const label = `${evidenceTypeLabel(src.type)} · ${evidenceConfidenceLabel(src.confidence)}`
  if (src.url) {
    wrap.appendChild(el('a', { class: 'evidence-chip', href: src.url, target: '_blank', rel: 'noopener' }, label))
  } else {
    wrap.appendChild(el('span', { class: 'evidence-chip' }, label))
  }
  if (src.title) wrap.appendChild(el('span', { class: 'evidence-title' }, src.title))
  if (src.section || src.page) {
    const bits = [src.section, src.page ? copy[lang].page(src.page) : null].filter(Boolean).join(' · ')
    wrap.appendChild(el('span', { class: 'evidence-section' }, bits))
  }
  return wrap
}

function coverageStats(doc) {
  const stats = { total: doc.elements.length, manual: 0, official: 0, inferred: 0, curated: 0, gap: 0, structural: 0 }
  for (const e of doc.elements) stats[classifyCoverage(e.description, e.parameter_range)]++
  return stats
}

function renderSourcesFooter(doc) {
  const footer = el('div', { class: 'consumer-sources' })
  footer.appendChild(el('h3', {}, copy[lang].sourcesTitle))
  const statusText = copy[lang].statusText[doc.metadata.review_status] || ''
  footer.appendChild(el('p', { class: 'source-status' }, statusText))
  if (doc.metadata.evidence_as_of) {
    footer.appendChild(el('p', { class: 'source-status' }, copy[lang].evidenceAsOf(doc.metadata.evidence_as_of)))
  }
  if (doc.metadata.sources && doc.metadata.sources.length) {
    footer.appendChild(el('p', { class: 'source-list-intro' }, copy[lang].sourcesIntro))
    const list = el('ul', { class: 'source-list' })
    for (const src of doc.metadata.sources) list.appendChild(renderSourceLi(src))
    footer.appendChild(list)
  }
  if (doc.metadata.notes) footer.appendChild(el('p', { class: 'source-notes' }, doc.metadata.notes))
  return footer
}

function renderSourceLi(src) {
  const li = el('li')
  const urlMatch = src.match(/(https?:\/\/\S+)/)
  if (urlMatch) {
    const before = src.substring(0, urlMatch.index).replace(/[:：]?\s*$/, '').trim()
    if (before) li.appendChild(el('span', {}, before + '：'))
    const a = document.createElement('a')
    a.href = urlMatch[0]
    a.target = '_blank'
    a.rel = 'noopener'
    a.textContent = urlMatch[0]
    li.appendChild(a)
    const after = src.substring(urlMatch.index + urlMatch[0].length).trim()
    if (after) li.appendChild(el('span', {}, ' ' + after))
  } else {
    li.textContent = src
  }
  return li
}

// ---- Header rendering ----
function renderHeader() {
  document.title = `${docVendor(currentDoc)} ${docModel(currentDoc)} — OpenODC`
  titleEl.textContent = `${docVendor(currentDoc)} · ${docModel(currentDoc)}`
  subtitleEl.textContent = docFunctionName(currentDoc)
  badgesEl.innerHTML = ''
  badgesEl.appendChild(el('span', { class: `ads-pill ads-pill-l${currentDoc.ads_level}` }, adsLevelLabel(currentDoc.ads_level)))
  badgesEl.appendChild(el('span', { class: `status-pill status-${currentDoc.metadata.review_status}` }, reviewStatusLabel(currentDoc.metadata.review_status, lang)))
  badgesEl.appendChild(el('span', { class: 'meta-pill' }, currentDoc.metadata?.evidence_as_of ? copy[lang].evidenceBadge(currentDoc.metadata.evidence_as_of) : currentDoc.effective_date))
  if (currentDoc.software_version) badgesEl.appendChild(el('span', { class: 'meta-pill' }, currentDoc.software_version))
}

function attachActions() {
  document.querySelectorAll('.view-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.view === currentView)
    t.addEventListener('click', () => setView(t.dataset.view))
  })
  document.getElementById('copy-json').addEventListener('click', async () => {
    await navigator.clipboard.writeText(JSON.stringify(currentDoc, null, 2))
    alert(copy[lang].copyDone)
  })
  document.getElementById('download-json').addEventListener('click', () => {
    downloadBlob(JSON.stringify(currentDoc, null, 2), `${currentDoc.id}.json`, 'application/json')
  })
  document.getElementById('download-md').addEventListener('click', () => {
    downloadBlob(toMarkdown(currentDoc), `${currentDoc.id}.md`, 'text/markdown')
  })
}

function toMarkdown(doc) {
  let md = `# ${docVendor(doc)} ${docModel(doc)} — ${docFunctionName(doc)}\n\n`
  if (lang === 'en') {
    md += `- Automation level: ${adsLevelLabel(doc.ads_level)}\n`
    md += `- Software version: ${doc.software_version || '—'}\n`
    md += `- Effective date: ${doc.effective_date}\n`
    if (doc.metadata?.evidence_as_of) md += `- Evidence checked as of: ${doc.metadata.evidence_as_of}\n`
    md += `- Standard: ${doc.spec_source}\n`
    md += `- Review status: ${reviewStatusLabel(doc.metadata.review_status, lang)}\n\n`
    md += `> Generated by OpenODC. Unless the status is vendor-confirmed, this record is a community extraction from public sources and not a vendor official ODC declaration. L2 samples do not mean the vehicle can operate without driver supervision.\n\n`
  } else {
    md += `- 自动化等级：${adsLevelLabel(doc.ads_level)}\n`
    md += `- 软件版本：${doc.software_version || '—'}\n`
    md += `- 生效日期：${doc.effective_date}\n`
    if (doc.metadata?.evidence_as_of) md += `- 证据核验日期：${doc.metadata.evidence_as_of}\n`
    md += `- 标准依据：${doc.spec_source}\n`
    md += `- 审核状态：${reviewStatusLabel(doc.metadata.review_status, lang)}\n\n`
    md += `> 说明：本 Markdown 由 OpenODC 自动生成。除非审核状态为「厂家确认」，否则该记录为社区基于公开资料提取，不代表厂家官方 ODC 声明。L2 样例不表示车辆可以脱离驾驶员监管。\n\n`
  }

  const groups = groupByCategory(doc, currentIndex)
  for (const [_, g] of groups) {
    md += `## ${categoryName(g)}\n\n`
    md += `| ${copy[lang].element} | ${copy[lang].requirement} | ${copy[lang].description} | ${copy[lang].exitBehavior} |\n|---|---|---|---|\n`
    for (const e of g.elements) {
      const m = e._meta
      md += `| ${elementName(m)} (§${m.spec_section}) | ${requirementLabel(e.requirement, lang)} | ${localizeEvidenceText(e.description || '').replace(/\|/g, '\\|')}${e.parameter_range ? ' · ' + e.parameter_range : ''} | ${exitBehaviorLabel(e.exit_behavior, lang) || '—'} |\n`
    }
    md += '\n'
  }
  if (doc.associations?.length) {
    md += `## ${copy[lang].associations}\n\n`
    for (const a of doc.associations) {
      const p = elementName(currentIndex.get(a.primary_id) || { id: a.primary_id })
      const d = elementName(currentIndex.get(a.dependent_id) || { id: a.dependent_id })
      md += `- ${p} → ${d}：${a.description}\n`
    }
    md += '\n'
  }
  md += `---\n*由 OpenODC 生成 · ${new Date().toISOString()} · https://openodc.autozyx.com*\n`
  return md
}

;(async () => {
  try {
    const id = getQueryParam('id')
    if (!id) {
      containerEl.innerHTML = `<p class="error">${copy[lang].missingId} <a href="${lang === 'en' ? '/en/gallery.html' : '/gallery.html'}">${copy[lang].backGallery}</a></p>`
      return
    }
    const [catalog, manifest] = await Promise.all([loadCatalog(), loadManifest()])
    currentCatalog = catalog
    currentIndex = buildElementIndex(catalog)
    const entry = manifest.documents.find(d => d.id === id)
    if (!entry) throw new Error(copy[lang].sampleNotFound(id))
    currentDoc = await loadDocument(entry.file)
    renderHeader()
    attachActions()
    renderCurrent()
  } catch (e) {
    containerEl.innerHTML = `<p class="error">${copy[lang].loadFailed(e.message)}</p>`
  }
})()
