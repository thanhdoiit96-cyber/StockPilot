import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchForecastResearchHistory } from './forecastHistory.mjs'

const entry = { horizon_sessions: 5, as_of: '2025-01-01', outcome_status: 'measured', predicted_class: 'advancing', actual_class: 'balanced', confidence: .6,
  brier_multiclass_sum: .8, log_loss: 1.2, probabilities: [{ class: 'advancing', value: .6 }, { class: 'balanced', value: .3 }, { class: 'declining', value: .1 }] }
const payload = { status: 'research_history', synthetic: true, research_only: true, live: false, market_accuracy_verified: false, calibrated: false, horizon_sessions: 5,
  artifact_sha256: 'a'.repeat(64), artifact_freshness: 'fresh', summary: { predictions: 1, measured: 1, pending: 0 },
  reliability: { interpretation: 'diagnostic_only_not_calibration', bins: [] }, entries: [entry] }

test('accepts only explicit uncalibrated synthetic history', async t => {
  const original = global.fetch; t.after(() => { global.fetch = original })
  global.fetch = async () => ({ ok: true, json: async () => ({ data: payload }) })
  assert.equal((await fetchForecastResearchHistory(5)).status, 'research_history')
  global.fetch = async () => ({ ok: true, json: async () => ({ data: { ...payload, calibrated: true } }) })
  assert.equal((await fetchForecastResearchHistory(5)).reason, 'invalid_contract')
})
test('rejects inconsistent counts and malformed measured outcomes', async t => {
  const original = global.fetch; t.after(() => { global.fetch = original })
  global.fetch = async () => ({ ok: true, json: async () => ({ data: { ...payload, summary: { predictions: 2, measured: 1, pending: 0 } } }) })
  assert.equal((await fetchForecastResearchHistory(5)).reason, 'invalid_contract')
  global.fetch = async () => ({ ok: true, json: async () => ({ data: { ...payload, entries: [{ ...entry, log_loss: null }] } }) })
  assert.equal((await fetchForecastResearchHistory(5)).reason, 'invalid_entries')
})
