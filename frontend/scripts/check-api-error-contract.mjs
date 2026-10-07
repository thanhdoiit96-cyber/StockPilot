import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { apiErrorCatalog } from '../src/services/apiErrorCatalog.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const controllerDir = path.resolve(here, '../../backend/src/controllers')
const controllers = ['authController.js', 'recommendationController.js', 'portfolioController.js', 'stockController.js']
const sources = [...controllers.map(file => path.join(controllerDir, file)), path.resolve(here, '../../backend/src/middleware/requireAuth.js')]
const codes = new Set()
for (const file of sources) {
  const source = fs.readFileSync(file, 'utf8')
  for (const match of source.matchAll(/httpError\s*\(\s*[^,]+,\s*[^,]+,\s*['"]([^'"]+)['"]/g)) codes.add(match[1])
  for (const match of source.matchAll(/\bcode\s*:\s*['"]([^'"]+)['"]/g)) codes.add(match[1])
}
const catalog = apiErrorCatalog('en')
const missing = [...codes].filter(code => !catalog[code]).sort()
if (missing.length) {
  console.error(`API error catalog is missing: ${missing.join(', ')}`)
  process.exitCode = 1
} else {
  console.log(`API error contract passed: ${codes.size} backend codes covered`)
}
