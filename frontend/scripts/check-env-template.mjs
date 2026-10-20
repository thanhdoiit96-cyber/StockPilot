import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const templatePath = path.resolve(here, '../.env.example')
const expectedKeys = ['VITE_API_BASE_URL', 'VITE_ENABLE_FORECAST_RESEARCH', 'VITE_ENABLE_FORECAST_LIVE']

function parseTemplate(source) {
  const values = {}
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/)
    if (!match) continue
    assert.equal(Object.hasOwn(values, match[1]), false, `Duplicate ${match[1]} at line ${index + 1}`)
    values[match[1]] = match[2]
  }
  return values
}

try {
  const env = parseTemplate(fs.readFileSync(templatePath, 'utf8'))
  assert.deepEqual(Object.keys(env).sort(), expectedKeys.slice().sort(), 'Template keys must match the supported public frontend contract')
  assert.equal(env.VITE_API_BASE_URL, '', 'VITE_API_BASE_URL must stay empty so cookie auth uses the same-origin /api proxy')
  assert.equal(env.VITE_ENABLE_FORECAST_RESEARCH, 'false')
  assert.equal(env.VITE_ENABLE_FORECAST_LIVE, 'false')
  console.log('Frontend environment template passed: same-origin API and gated forecasts are safe by default.')
} catch (error) {
  console.error(`Frontend environment template check failed: ${error.message}`)
  process.exitCode = 1
}
