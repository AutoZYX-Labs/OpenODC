// fill-coverage.mjs
// Ensures a curated ODC JSON covers all 144 GB/T 45312-2025 elements.
// Missing elements are inserted with a "[手册未涉及]" marker — the gap
// itself is data: it shows where the vendor manual is silent relative
// to the national standard.
//
// Usage:
//   node tools/fill-coverage.mjs data/examples/huawei-ads4-aito-m9.json
//
// The tool preserves curated entries and only inserts missing ones.
// After insertion, elements are re-sorted by standard section (§X.Y.Z).

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const catDir = join(repoRoot, 'schema', 'categories')

function loadCatalog() {
  const all = []
  for (const f of readdirSync(catDir)) {
    const cat = JSON.parse(readFileSync(join(catDir, f), 'utf8'))
    for (const e of cat.elements) all.push(e)
  }
  return all
}

function sectionSortKey(section) {
  if (!section) return []
  return section.split('.').map(p => {
    const n = parseInt(p, 10)
    return isNaN(n) ? p.charCodeAt(0) : n
  })
}
function cmp(a, b) {
  const al = a.length, bl = b.length
  const n = Math.min(al, bl)
  for (let i = 0; i < n; i++) {
    if (a[i] < b[i]) return -1
    if (a[i] > b[i]) return 1
  }
  return al - bl
}

function looksLikeParent(elem) {
  // Parents are structural nodes with level 2 or 3 and no description/requirement template
  return elem.level <= 3 && !elem.description_zh && !elem.requirement_template
}

function defaultForMissing(elem) {
  if (looksLikeParent(elem)) {
    return {
      element_id: elem.id,
      requirement: 'permitted',
      description: '[结构性类别] 详见下级元素'
    }
  }
  return {
    element_id: elem.id,
    requirement: 'permitted',
    description: '[手册未涉及] 该要素在官方手册 / 公开资料中未被明确声明；正是国标 GB/T 45312—2025 相对厂家文档的增量价值点。'
  }
}

function main() {
  const target = process.argv[2]
  if (!target) {
    console.error('Usage: node tools/fill-coverage.mjs <path/to/sample.json>')
    process.exit(1)
  }
  const absPath = join(repoRoot, target)
  const doc = JSON.parse(readFileSync(absPath, 'utf8'))
  const catalog = loadCatalog()
  const metaById = new Map(catalog.map(e => [e.id, e]))

  const existing = new Set(doc.elements.map(e => e.element_id))
  const missing = catalog.filter(e => !existing.has(e.id))

  const additions = missing.map(defaultForMissing)
  const allElements = [...doc.elements, ...additions]

  // Stable sort by standard section for readability
  allElements.sort((a, b) => {
    const ma = metaById.get(a.element_id), mb = metaById.get(b.element_id)
    if (!ma || !mb) return 0
    return cmp(sectionSortKey(ma.spec_section), sectionSortKey(mb.spec_section))
  })

  doc.elements = allElements
  writeFileSync(absPath, JSON.stringify(doc, null, 2) + '\n', 'utf8')

  const manualCovered = allElements.filter(e => !(e.description || '').includes('[手册未涉及]') && !(e.description || '').includes('[结构性类别]')).length
  const manualGap = allElements.filter(e => (e.description || '').includes('[手册未涉及]')).length
  const structural = allElements.filter(e => (e.description || '').includes('[结构性类别]')).length

  console.log(`${target}: total ${allElements.length} / 144`)
  console.log(`  curated (manual + inferred): ${manualCovered}`)
  console.log(`  manual gap [手册未涉及]: ${manualGap}`)
  console.log(`  structural parents [结构性类别]: ${structural}`)
  console.log(`  added this run: ${additions.length}`)
}

main()
