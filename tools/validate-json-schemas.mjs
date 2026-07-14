import Ajv2019 from 'ajv/dist/2019.js'
import addFormats from 'ajv-formats'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const readJson = path => JSON.parse(readFileSync(path, 'utf8'))
const ajv = new Ajv2019({ strict: false, allErrors: true })
addFormats(ajv)
const validators = new Map()

function validate(schemaPath, dataPath) {
  const data = readJson(dataPath)
  let validator = validators.get(schemaPath)
  if (!validator) {
    validator = ajv.compile(readJson(schemaPath))
    validators.set(schemaPath, validator)
  }
  if (!validator(data)) {
    const errors = ajv.errorsText(validator.errors, { separator: '\n  ' })
    throw new Error(`${dataPath} does not match ${schemaPath}:\n  ${errors}`)
  }
  console.log(`${dataPath.replace(`${repoRoot}/`, '')} valid`)
}

const odcSchema = join(repoRoot, 'schema', 'odc.schema.json')
for (const file of readdirSync(join(repoRoot, 'data', 'examples')).filter(file => file.endsWith('.json')).sort()) {
  validate(odcSchema, join(repoRoot, 'data', 'examples', file))
}
validate(
  join(repoRoot, 'schema', 'road-rules', 'road-rule-profile.schema.json'),
  join(repoRoot, 'data', 'road-rules', 'obligations.json')
)
