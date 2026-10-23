'use strict';
const { performance } = require('node:perf_hooks');
const endpoints = ['/api/recommendations/latest', '/api/recommendations/history?limit=10', '/api/recommendations/history/summary', '/api/forecast/live-cohort?horizon=5'];
const percentile = (values, fraction) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * fraction) - 1];
async function main() {
  const base = new URL(process.env.MEASURE_API_ORIGIN || 'http://127.0.0.1:5000');
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname) || !['http:', 'https:'].includes(base.protocol)) throw new Error('local API origin is required');
  const results = [];
  for (const endpoint of endpoints) {
    const samples = [];
    for (let index = 0; index < 5; index++) {
      const start = performance.now();
      try {
        const response = await fetch(new URL(endpoint, base), { signal: AbortSignal.timeout(15000), redirect: 'error' });
        const bytes = await response.arrayBuffer();
        let json; try { json = JSON.parse(Buffer.from(bytes).toString('utf8')); } catch { /* Invalid JSON is reported below. */ }
        samples.push({ milliseconds: Math.round((performance.now() - start) * 100) / 100, bytes: bytes.byteLength, http_status: response.status, success: response.ok && json?.success === true });
      } catch (error) { samples.push({ success: false, error: error.name }); }
    }
    const valid = samples.filter(sample => sample.success);
    results.push({ endpoint, samples, successful: valid.length, p50_ms: valid.length ? percentile(valid.map(sample => sample.milliseconds), .5) : null, p95_ms: valid.length ? percentile(valid.map(sample => sample.milliseconds), .95) : null, maximum_payload_bytes: valid.length ? Math.max(...valid.map(sample => sample.bytes)) : null });
  }
  console.log(JSON.stringify({ generated_at: new Date().toISOString(), origin: base.origin, mode: 'database_read_endpoints_only', samples_per_endpoint: 5, results }, null, 2));
  if (results.some(result => result.successful !== 5)) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
