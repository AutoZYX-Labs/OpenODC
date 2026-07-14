import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildExportPayload,
  buildExportRecords,
  exportRecordsToCsv,
  exportRecordsToMarkdown
} from '../site/js/road-rule-export.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const profile = JSON.parse(readFileSync(join(repoRoot, 'data', 'road-rules', 'obligations.json'), 'utf8'))

const categoryLabels = {
  traffic_signal: '交通信号',
  road_traffic: '道路通行',
  vehicle_operation: '车辆操作',
  priority_interaction: '优先权与交互',
  special_risk: '特殊与风险处置'
}
const derivationLabels = {
  engineering_interpretation: '工程解释',
  engineering_candidate: '工程候选'
}
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

function parseCsv(input) {
  const value = input.replace(/^\ufeff/, '')
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (quoted) {
      if (character === '"' && value[index + 1] === '"') {
        cell += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        cell += character
      }
    } else if (character === '"') {
      quoted = true
    } else if (character === ',') {
      row.push(cell)
      cell = ''
    } else if (character === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else if (character !== '\r') {
      cell += character
    }
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

function recordsFromCsv(csv) {
  const rows = parseCsv(csv)
  const headers = rows.shift()
  return rows.filter(row => row.length === headers.length).map(row => {
    const values = Object.fromEntries(headers.map((header, index) => [header, row[index]]))
    const record = {
      order: Number(values.order),
      id: values.id,
      category: values.category
    }
    for (const field of nestedFields) record[field] = JSON.parse(values[`${field}_json`])
    return record
  })
}

function recordsFromMarkdown(markdown) {
  return [...markdown.matchAll(/```json\n([\s\S]*?)\n```/g)].map(match => JSON.parse(match[1]))
}

function assertSame(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} differs from the canonical export records`)
  }
}

function verify(obligations, filters, label) {
  const records = buildExportRecords(profile, obligations)
  const payload = buildExportPayload(profile, obligations, filters)
  const csvRecords = recordsFromCsv(exportRecordsToCsv(records))
  const markdownRecords = recordsFromMarkdown(exportRecordsToMarkdown(profile, records, 'zh', categoryLabels, derivationLabels))
  assertSame(payload.obligations, records, `${label} JSON`)
  assertSame(csvRecords, records, `${label} CSV`)
  assertSame(markdownRecords, records, `${label} Markdown`)
  if (payload.result_count !== records.length) throw new Error(`${label} result count differs`)
}

verify(profile.obligations, {}, 'full export')
const subset = profile.obligations.filter(item => item.category === 'vehicle_operation')
verify(subset, { category: 'vehicle_operation' }, 'filtered export')

console.log('Road-rule export parity valid: JSON, CSV, and Markdown preserve the same full traceability records.')
