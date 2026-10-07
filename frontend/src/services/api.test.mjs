import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { requestJson, stockList, stockDetail, stockAnalysis, aiGateStatus, recommendationStatus, recommendationHistory, recommendationReadiness, startRequest } from './api.mjs'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })
const json = payload => new Response(JSON.stringify(payload), { status: 200 })

test('HTTP failures remain errors even with a success-looking body or HTML', async () => {
  for (const status of [404, 429, 500]) {
    globalThis.fetch = async () => new Response(status === 500 ? '<html>Error</html>' : '{"success":true,"data":[]}', { status })
    await assert.rejects(requestJson('/api/stocks'), error => error.status === status)
  }
})

test('malformed JSON and unsuccessful payloads are not empty stock lists', async () => {
  globalThis.fetch = async () => new Response('<html>Wrong proxy</html>')
  await assert.rejects(requestJson('/api/stocks'), /JSON/)
  globalThis.fetch = async () => json({ success: false, data: [] })
  await assert.rejects(requestJson('/api/stocks'), /thất bại/)
  assert.throws(() => stockList({ success: true, data: {} }), /định dạng/)
  assert.throws(() => stockDetail({ success: true, data: { id: 'a' } }), /định dạng/)
})

test('a valid empty result succeeds and preserves the empty state', async () => {
  globalThis.fetch = async () => json({ success: true, data: [] })
  const states = []
  await startRequest('/api/stocks', stockList, state => states.push(state)).done
  assert.deepEqual(states.at(-1), { status: 'success', data: [], error: '' })
})

test('network failures become actionable errors and a retry clears them', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  const states = []
  await startRequest('/api/stocks', stockList, state => states.push(state)).done
  assert.equal(states.at(-1).status, 'error')
  assert.match(states.at(-1).error, /kết nối/)
  globalThis.fetch = async () => json({ success: true, data: [{ id: 'a' }] })
  await startRequest('/api/stocks', stockList, state => states.push(state)).done
  assert.deepEqual(states.at(-2), { status: 'loading', data: null, error: '' })
  assert.deepEqual(states.at(-1), { status: 'success', data: [{ id: 'a' }], error: '' })
})

test('late response from a cancelled selection cannot replace the latest stock', async () => {
  const pending = new Map()
  globalThis.fetch = (url, options) => new Promise(resolve => pending.set(url, { resolve, signal: options.signal }))
  const states = []
  const old = startRequest('/a', stockDetail, state => states.push(state))
  old.cancel()
  const latest = startRequest('/b', stockDetail, state => states.push(state))
  pending.get('/b').resolve(json({ success: true, data: { id: 'b', price_history: [] } }))
  await latest.done
  pending.get('/a').resolve(json({ success: true, data: { id: 'a', price_history: [] } }))
  await old.done
  assert.equal(pending.get('/a').signal.aborted, true)
  assert.deepEqual(states.filter(state => state.status === 'success').map(state => state.data.id), ['b'])
})

test('cleanup suppresses late failures without showing an abort error', async () => {
  let rejectFetch
  globalThis.fetch = () => new Promise((resolve, reject) => { rejectFetch = reject })
  const states = []
  const request = startRequest('/a', stockDetail, state => states.push(state))
  request.cancel()
  rejectFetch(new DOMException('Aborted', 'AbortError'))
  await request.done
  assert.deepEqual(states.map(state => state.status), ['loading'])
})

test('failure of an auxiliary resource does not discard a successful stock request', async () => {
  globalThis.fetch = async url => url === '/cache'
    ? new Response('Unavailable', { status: 503 })
    : json({ success: true, data: [{ id: 'a' }] })
  let stocks, cache
  await Promise.all([
    startRequest('/stocks', stockList, state => { stocks = state }).done,
    startRequest('/cache', value => value, state => { cache = state }).done
  ])
  assert.equal(stocks.status, 'success')
  assert.equal(cache.status, 'error')
})


test('analysis payload requires quality gate and risk plan before rendering', () => {
  assert.throws(() => stockAnalysis({ success: true, data: { observations: 6, indicators: {} } }))
  const payload = { success: true, data: { observations: 250, indicators: {}, quality: { status: 'pass' }, risk_plan: { status: 'available' }, evaluation_factors: [], horizon_advice: { short_term: {}, medium_term: {}, long_term: {} }, expert_guidance: { score_breakdown: [] } } }
  assert.deepEqual(stockAnalysis(payload), payload.data)
})

test('HTTP error codes are preserved for locale-aware presentation', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ success: false, code: 'quote_provider_unavailable', message: 'Realtime quote provider unavailable' }), { status: 503 })
  await assert.rejects(requestJson('/api/stocks/a/quote'), error => error.status === 503 && error.code === 'quote_provider_unavailable' && /Realtime quote provider unavailable/.test(error.message))
})

test('AI gate status requires an explicit boolean decision and reasons', () => {
  const payload = { success: true, data: { enabled: false, reasons: ['provider_display_rights_not_verified'], evaluated_at: '2026-09-20T10:00:00.000Z' } }
  assert.deepEqual(aiGateStatus(payload), payload.data)
  assert.throws(() => aiGateStatus({ success: true, data: { enabled: false } }), /định dạng/)
})

test('recommendation payload preserves empty qualified universe', () => {
  const payload = { success: true, data: { status: 'completed', recommendations: [], run: { selected_count: 0 } } }
  assert.deepEqual(recommendationStatus(payload), payload.data)
})

test('recommendation history accepts measured and pending runs', () => {
  const payload = { success: true, data: [{ selected_count: 5, measured_count: 3, pending_count: 2, hit_rate_pct: 66.67 }] }
  assert.deepEqual(recommendationHistory(payload), payload.data)
})

test('recommendation readiness preserves coverage gate', () => {
  const payload = { success: true, data: { universe_size: 3, eligible_symbols: 2, minimum_observations: 50, coverage: [{ code: 'FPT', observations: 100, eligible: true }] } }
  assert.equal(recommendationReadiness(payload).eligible_symbols, 2)
  assert.throws(() => recommendationReadiness({ success: true, data: {} }), /định dạng/)
})

