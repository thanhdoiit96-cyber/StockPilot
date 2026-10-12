import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchForecastResearchPreview } from './forecastPreview.mjs'
test('accepts only the explicitly synthetic research contract', async t => {
  const original = global.fetch; t.after(() => { global.fetch = original })
  global.fetch = async () => ({ ok: true, json: async () => ({ data: { status: 'research_preview', synthetic: true, research_only: true, live: false, market_accuracy_verified: false, horizon_sessions: 5, probabilities: [{ class: 'declining', value: .2 }, { class: 'advancing', value: .5 }, { class: 'balanced', value: .3 }] } }) })
  const result = await fetchForecastResearchPreview(5)
  assert.equal(result.status, 'research_preview')
  assert.deepEqual(result.probabilities.map(item => item.class), ['advancing', 'balanced', 'declining'])
})
test('fails closed for live-shaped, malformed and disabled responses', async t => {
  const original = global.fetch; t.after(() => { global.fetch = original })
  global.fetch = async () => ({ ok: true, json: async () => ({ data: { status: 'research_preview', synthetic: true, research_only: true, live: true, market_accuracy_verified: false, horizon_sessions: 1, probabilities: [] } }) })
  assert.equal((await fetchForecastResearchPreview(1)).reason, 'invalid_contract')
  global.fetch = async () => ({ ok: false, status: 404 })
  assert.equal((await fetchForecastResearchPreview(1)).reason, 'preview_disabled')
})
