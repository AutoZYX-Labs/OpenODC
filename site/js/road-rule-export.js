const localized = (value, lang) => value?.[lang] || value?.zh || value?.en || ''

const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`

export function buildExportRecords(profile, obligations) {
  const sources = new Map(profile.sources.map(source => [source.id, source]))
  return obligations.map(item => ({
    order: item.order,
    id: item.id,
    category: item.category,
    title: item.title,
    normative_rule: item.normative_rule,
    normative_subject: item.normative_subject,
    summary: item.summary,
    derivation: item.derivation,
    source_refs: item.source_refs.map(sourceRef => ({
      ...sourceRef,
      source: sources.get(sourceRef.source_id)
    })),
    odc_mappings: item.odc_mappings,
    applicability: item.applicability,
    scenario_hooks: item.scenario_hooks,
    review: item.review
  }))
}

export function buildExportPayload(profile, obligations, filters) {
  const records = buildExportRecords(profile, obligations)
  return {
    schema_version: profile.schema_version,
    profile: profile.profile,
    filters,
    result_count: records.length,
    obligations: records
  }
}

export function exportRecordsToCsv(records) {
  const nestedFields = [
    'title',
    'normative_rule',
    'normative_subject',
    'summary',
    'derivation',
    'source_refs',
    'odc_mappings',
    'applicability',
    'scenario_hooks',
    'review'
  ]
  const headers = ['order', 'id', 'category', ...nestedFields.map(field => `${field}_json`)]
  const rows = records.map(record => [
    record.order,
    record.id,
    record.category,
    ...nestedFields.map(field => JSON.stringify(record[field]))
  ])
  return '\ufeff' + [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\n') + '\n'
}

export function exportRecordsToMarkdown(profile, records, lang, categoryLabels, derivationLabels) {
  const title = lang === 'en' ? '# OpenODC Road-Rule Mapping' : '# OpenODC 道路规则映射'
  const subjectLabel = lang === 'en' ? 'Legal subject' : '法律义务主体'
  const ruleLabel = lang === 'en' ? 'Public rule' : '公开规则'
  const derivationLabel = lang === 'en' ? 'Engineering layer' : '工程映射层级'
  const sourceLabel = lang === 'en' ? 'Public source' : '公开来源'
  const odcLabel = lang === 'en' ? 'ODC semantic mapping' : 'ODC 语义映射'
  const applicabilityLabel = lang === 'en' ? 'Applicability' : '适用条件'
  const triggerLabel = lang === 'en' ? 'Scenario trigger' : '场景触发点'
  const responseLabel = lang === 'en' ? 'Expected response' : '期望响应'
  const evidenceLabel = lang === 'en' ? 'Evidence candidates' : '候选验证证据'
  const machineLabel = lang === 'en' ? 'Machine-readable traceability record' : '机器可读追溯记录'
  const lines = [title, '', localized(profile.profile.disclaimer, lang), '']

  for (const record of records) {
    lines.push(`## ${String(record.order).padStart(2, '0')} ${localized(record.title, lang)}`, '')
    lines.push(`- ${lang === 'en' ? 'Category' : '类别'}: ${categoryLabels[record.category] || record.category}`)
    lines.push(`- ${ruleLabel}: ${localized(record.normative_rule, lang)}`)
    lines.push(`- ${subjectLabel}: ${localized(record.normative_subject.label, lang)}`)
    lines.push(`- ${derivationLabel}: ${derivationLabels[record.derivation.type] || record.derivation.type}`)
    lines.push(`- ${lang === 'en' ? 'Engineering statement' : '工程说明'}: ${localized(record.derivation.statement, lang)}`)
    lines.push(`- ${applicabilityLabel}: ${localized(record.applicability[0].condition, lang)}`)
    lines.push(`- ${triggerLabel}: ${localized(record.scenario_hooks[0].trigger, lang)}`)
    lines.push(`- ${responseLabel}: ${localized(record.scenario_hooks[0].expected_response, lang)}`)
    lines.push(`- ${evidenceLabel}: ${record.scenario_hooks[0].evidence_candidates.join(', ')}`)
    for (const sourceRef of record.source_refs) {
      lines.push(`- ${sourceLabel}: [${localized(sourceRef.source.title, lang)}](${sourceRef.source.url}) · ${sourceRef.clauses.join(', ')} · ${localized(sourceRef.interpretation, lang)}`)
    }
    for (const mapping of record.odc_mappings) {
      lines.push(`- ${odcLabel}: \`${mapping.element_id}\` · ${mapping.relation} · ${localized(mapping.rationale, lang)}`)
    }
    lines.push('', `<details><summary>${machineLabel}</summary>`, '', '```json', JSON.stringify(record, null, 2), '```', '', '</details>', '')
  }
  return lines.join('\n')
}
