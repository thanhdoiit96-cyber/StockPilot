import fs from 'node:fs'
import path from 'node:path'
const root = process.cwd()
const files = []
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', 'dist'].includes(entry.name)) continue
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.(jsx?|mjs|css|html)$/.test(entry.name)) files.push(full)
  }
}
walk(path.join(root, 'src'))
if (fs.existsSync(path.join(root, 'dist'))) walk(path.join(root, 'dist'))
// Match common UTF-8-as-Latin-1 mojibake without flagging valid Vietnamese
// characters such as Â in “CÁ NHÂN”. A standalone Ã/Â is valid text; the
// corrupted form is followed by a Latin-1 continuation byte or a replacement
// marker sequence.
const markers = /(?:�|ï¿½|Ã[\u0080-\u00bf]|Â[\u0080-\u00bf]|â(?:€|™|œ|€¦|—|…))/u
const failures = files.filter(file => markers.test(fs.readFileSync(file, 'utf8')))
if (failures.length) { console.error(`Encoding check failed in: ${failures.map(file => path.relative(root, file)).join(', ')}`); process.exit(1) }
const appSource = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8')
const escapedVietnamese = /\\u(?:00|01|1e)[0-9a-f]{2}|\\x[c-f][0-9a-f]/i
const damagedLabels = /["`](?:Bn|Xa|Gi EOD|Trong my|Trung tnh|Theo di thm)["`]|Generative AI\s{2}m|(?:vợt đề xuất|xem xt rủi ro)/
if (escapedVietnamese.test(appSource) || damagedLabels.test(appSource)) {
  console.error('Encoding check failed: App.jsx still contains escaped or damaged Vietnamese labels.')
  process.exit(1)
}
console.log(`Encoding check passed (${files.length} source files).`)


