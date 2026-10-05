import fs from 'node:fs'

const app = fs.readFileSync('backend/src/app.js', 'utf8')
const rules = fs.readFileSync('ops/prometheus/alerts.yml', 'utf8')
const metrics = [...new Set([...rules.matchAll(/stockpilot_[a-z0-9_]+/g)].map(match => match[0]))]
const missing = metrics.filter(metric => !app.includes(metric))
if (missing.length) throw new Error(`Alert rules reference unexported metrics: ${missing.join(', ')}`)
if (!rules.includes('for: 5m')) throw new Error('Alert rules must include a pending duration')
if (!fs.readFileSync('ops/prometheus/prometheus.yml', 'utf8').includes('bearer_token_file')) throw new Error('Prometheus scrape must use a secret bearer token file')
console.log(`Prometheus contract passed (${metrics.length} metrics, secret scrape, pending alerts)`)
