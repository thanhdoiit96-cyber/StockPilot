import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchForecastResearchHistory, mergeForecastHistory } from './forecastHistory.mjs'

const entry = { horizon_sessions: 5, as_of: '2025-01-01', outcome_status: 'measured', predicted_class: 'advancing', actual_class: 'balanced', confidence: .6,
  brier_multiclass_sum: .8, log_loss: 1.2, probabilities: [{ class: 'advancing', value: .6 }, { class: 'balanced', value: .3 }, { class: 'declining', value: .1 }] }
const payload = { status: 'research_history', source: 'snapshot_store', synthetic: true, research_only: true, live: false, market_accuracy_verified: false, calibrated: false, horizon_sessions: 5,
  summary: { predictions: 1, measured: 1, pending: 0 }, reliability: { interpretation: 'diagnostic_only_not_calibration', bins: [] },
  pagination: { has_more: false, next_cursor: null }, entries: [entry] }

test('accepts only explicit uncalibrated synthetic history', async t => {
  const original = global.fetch; t.after(() => { global.fetch = original })
  global.fetch = async () => ({ ok: true, json: async () => ({ data: payload }) })
  assert.equal((await fetchForecastResearchHistory(5)).status, 'research_history')
  global.fetch = async () => ({ ok: true, json: async () => ({ data: { ...payload, calibrated: true } }) })
  assert.equal((await fetchForecastResearchHistory(5)).reason, 'invalid_contract')
})
test('merges cursor pages without duplicating entries and recomputes loaded scores', () => {
  const nextEntry = { ...entry, as_of: '2025-01-02', id: 'two', brier_multiclass_sum: .4, log_loss: .8, correct: true }
  const merged = mergeForecastHistory({ ...payload, entries: [{ ...entry, id: 'one', correct: false }] }, { ...payload, entries: [nextEntry], pagination: { has_more: false, next_cursor: null } })
  assert.equal(merged.entries.length, 2); assert.ok(Math.abs(merged.summary.brier_multiclass_sum - .6) < 1e-12); assert.equal(merged.summary.accuracy, .5)
})
test('rejects inconsistent counts and malformed measured outcomes', async t => {
  const original = global.fetch; t.after(() => { global.fetch = original })
  global.fetch = async () => ({ ok: true, json: async () => ({ data: { ...payload, summary: { predictions: 2, measured: 1, pending: 0 } } }) })
  assert.equal((await fetchForecastResearchHistory(5)).reason, 'invalid_contract')
  global.fetch = async () => ({ ok: true, json: async () => ({ data: { ...payload, entries: [{ ...entry, log_loss: null }] } }) })
  assert.equal((await fetchForecastResearchHistory(5)).reason, 'invalid_entries')
})
