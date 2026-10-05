import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const app = fs.readFileSync(path.join(root, 'backend/src/app.js'), 'utf8')
const rules = fs.readFileSync(path.join(root, 'ops/prometheus/alerts.yml'), 'utf8')
const metrics = [...new Set([...rules.matchAll(/stockpilot_[a-z0-9_]+/g)].map(match => match[0]))]
const missing = metrics.filter(metric => !app.includes(metric))
if (missing.length) throw new Error(`Alert rules reference unexported metrics: ${missing.join(', ')}`)
if (!rules.includes('for: 5m')) throw new Error('Alert rules must include a pending duration')
if (!fs.readFileSync(path.join(root, 'ops/prometheus/prometheus.yml'), 'utf8').includes('bearer_token_file')) throw new Error('Prometheus scrape must use a secret bearer token file')
console.log(`Prometheus contract passed (${metrics.length} metrics, secret scrape, pending alerts)`)
