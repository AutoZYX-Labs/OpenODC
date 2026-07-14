import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const data = JSON.parse(readFileSync(join(repoRoot, 'data', 'road-rules', 'obligations.json'), 'utf8'))
const lock = JSON.parse(readFileSync(join(repoRoot, 'schema', 'compatibility', 'openodc-0.1.0.lock.json'), 'utf8'))

const problems = []
const assert = (condition, message) => { if (!condition) problems.push(message) }
const hashIds = values => createHash('sha256').update([...values].sort().join('\n') + '\n').digest('hex')
const hashFile = file => createHash('sha256').update(readFileSync(file)).digest('hex')
const sameSet = (left, right) => left.size === right.size && [...left].every(value => right.has(value))

const catalog = new Map()
for (const file of readdirSync(join(repoRoot, 'schema', 'categories')).filter(file => file.endsWith('.json'))) {
  const category = JSON.parse(readFileSync(join(repoRoot, 'schema', 'categories', file), 'utf8'))
  for (const element of category.elements) {
    assert(!catalog.has(element.id), `Duplicate catalog element ID: ${element.id}`)
    catalog.set(element.id, element)
  }
}

const sampleFiles = readdirSync(join(repoRoot, 'data', 'examples')).filter(file => file.endsWith('.json'))
const sampleIds = sampleFiles.map(file => JSON.parse(readFileSync(join(repoRoot, 'data', 'examples', file), 'utf8')).id)
assert(catalog.size === lock.catalog_element_count, `Catalog count changed: ${catalog.size}`)
assert(hashIds(catalog.keys()) === lock.catalog_id_set_sha256, 'Catalog ID compatibility hash changed')
assert(sampleIds.length === lock.sample_count, `Sample count changed: ${sampleIds.length}`)
assert(hashIds(sampleIds) === lock.sample_id_set_sha256, 'Sample ID compatibility hash changed')
assert(sameSet(new Set(sampleFiles), new Set(Object.keys(lock.sample_files_sha256 || {}))), 'Sample file set changed')
for (const file of sampleFiles) {
  assert(hashFile(join(repoRoot, 'data', 'examples', file)) === lock.sample_files_sha256?.[file], `Sample content hash changed: ${file}`)
}

assert(data.schema_version === '0.1.0', `Unexpected road-rule schema version: ${data.schema_version}`)
assert(data.profile?.version === '0.5.0', `Unexpected product version: ${data.profile?.version}`)
assert(data.obligations?.length === 20, `Expected 20 obligations, found ${data.obligations?.length}`)

const sources = new Map((data.sources || []).map(source => [source.id, source]))
const obligationIds = new Set()
const order = new Set()
const nestedIds = new Set()
const categoryCounts = new Map()
let clauseReferenceCount = 0
let mappingCount = 0
let engineeringCandidateCount = 0

for (const source of data.sources || []) {
  assert(source.status === 'current', `Source ${source.id} is not current`)
  assert(/^https:\/\//.test(source.url), `Source ${source.id} is not HTTPS`)
  assert(source.authority?.zh && source.authority?.en, `Source ${source.id} has no bilingual authority`)
  assert(/^[a-f0-9]{64}$/.test(source.version_evidence?.reference_fingerprint_sha256 || ''), `Source ${source.id} has no version-evidence fingerprint`)
  const sourceReference = {
    id: source.id,
    type: source.type,
    titleZh: source.title.zh,
    titleEn: source.title.en,
    authorityZh: source.authority.zh,
    authorityEn: source.authority.en,
    url: source.url,
    checked_on: source.checked_on,
    recordIdentifier: source.version_evidence.record_identifier
  }
  assert(
    createHash('sha256').update(JSON.stringify(sourceReference)).digest('hex') === source.version_evidence.reference_fingerprint_sha256,
    `Source ${source.id} version-evidence fingerprint does not match its metadata`
  )
}

for (const obligation of data.obligations || []) {
  assert(!obligationIds.has(obligation.id), `Duplicate obligation ID: ${obligation.id}`)
  obligationIds.add(obligation.id)
  assert(!order.has(obligation.order), `Duplicate obligation order: ${obligation.order}`)
  order.add(obligation.order)
  categoryCounts.set(obligation.category, (categoryCounts.get(obligation.category) || 0) + 1)
  assert(obligation.normative_rule?.zh && obligation.normative_rule?.en, `${obligation.id}: no bilingual normative rule`)
  assert(obligation.normative_subject?.label?.zh && obligation.normative_subject?.legal_boundary?.zh, `${obligation.id}: no legal-subject boundary`)
  assert(['engineering_interpretation', 'engineering_candidate'].includes(obligation.derivation?.type), `${obligation.id}: invalid engineering derivation`)
  assert(obligation.derivation?.statement?.zh && obligation.derivation?.statement?.en, `${obligation.id}: no engineering-derivation statement`)
  if (obligation.derivation?.type === 'engineering_candidate') engineeringCandidateCount += 1
  assert(obligation.review?.status === 'public_source_and_engineering_mapping_reviewed', `${obligation.id}: invalid review status`)
  assert(obligation.review?.reviewer_role?.zh && obligation.review?.reviewed_on, `${obligation.id}: incomplete manual review record`)
  assert(obligation.source_refs?.length > 0, `${obligation.id}: no source references`)
  assert(obligation.odc_mappings?.length > 0, `${obligation.id}: no ODC mappings`)
  assert(obligation.applicability?.length > 0, `${obligation.id}: no applicability condition`)
  assert(obligation.scenario_hooks?.length > 0, `${obligation.id}: no scenario hook`)

  for (const sourceRef of obligation.source_refs || []) {
    assert(sources.has(sourceRef.source_id), `${obligation.id}: unknown source ${sourceRef.source_id}`)
    clauseReferenceCount += sourceRef.clauses?.length || 0
  }
  for (const odcMapping of obligation.odc_mappings || []) {
    assert(catalog.has(odcMapping.element_id), `${obligation.id}: unknown ODC element ${odcMapping.element_id}`)
    mappingCount += 1
  }
  for (const condition of obligation.applicability || []) {
    assert(!nestedIds.has(condition.id), `Duplicate nested ID: ${condition.id}`)
    nestedIds.add(condition.id)
    for (const elementId of condition.odc_element_ids || []) {
      assert(catalog.has(elementId), `${condition.id}: unknown ODC element ${elementId}`)
    }
    assert(
      sameSet(new Set(condition.odc_element_ids || []), new Set((obligation.odc_mappings || []).map(item => item.element_id))),
      `${condition.id}: applicability elements differ from ODC mappings`
    )
  }
  for (const hook of obligation.scenario_hooks || []) {
    assert(!nestedIds.has(hook.id), `Duplicate nested ID: ${hook.id}`)
    nestedIds.add(hook.id)
  }
}

for (let value = 1; value <= 20; value += 1) {
  assert(order.has(value), `Missing obligation order: ${value}`)
}
for (const category of ['traffic_signal', 'road_traffic', 'vehicle_operation', 'priority_interaction', 'special_risk']) {
  assert(categoryCounts.get(category) === 4, `Expected 4 obligations in ${category}, found ${categoryCounts.get(category) || 0}`)
}
assert(engineeringCandidateCount >= 2, `Expected explicit engineering candidates, found ${engineeringCandidateCount}`)

const serialized = JSON.stringify(data)
for (const forbiddenField of ['"vendor"', '"model"', '"compliance_result"', '"compliance_score"']) {
  assert(!serialized.includes(forbiddenField), `Forbidden product/compliance field present: ${forbiddenField}`)
}

if (problems.length) {
  console.error(`Road-rule validation failed with ${problems.length} problem(s):`)
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

console.log(`Road-rule profile valid: ${data.obligations.length} obligations, ${sources.size} current public sources, ${catalog.size} ODC elements.`)
console.log(`Trace closed: ${clauseReferenceCount} clause references, ${mappingCount} ODC mappings, ${engineeringCandidateCount} engineering candidates.`)
console.log('Compatibility lock valid: 144 catalog elements and the exact content of 6 public samples are unchanged.')
