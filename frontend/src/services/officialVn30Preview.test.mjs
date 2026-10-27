import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchOfficialVn30Preview } from './forecastPreview.mjs'
import { forecastBreadthTarget } from './forecastBreadth.mjs'

test('OfficialVN30 strictly validates scope and does not fall back', async () => {
  const originalFetch = globalThis.fetch, originalFlag = globalThis.__VITE_ENABLE_FORECAST_LIVE__
  globalThis.__VITE_ENABLE_FORECAST_LIVE__ = 'true'
  let calls = 0
  const payload = { version: 'official_vn30_preview_v1', universe: 'OfficialVN30', horizon_sessions: 5, mode: 'internal_research', research_only: true, synthetic: false, live: false, publication_permitted: false, market_accuracy_verified: false, status: 'official_vn30_preview', coverage: { universe: 30, observed: 29, history_sessions: 60 }, membership: { membership_sha256: 'a'.repeat(64) }, input_sha256: 'b'.repeat(64), breadth_target: forecastBreadthTarget, as_of: '2026-10-26', probabilities: [{ class: 'advancing', value: .5 }, { class: 'balanced', value: .3 }, { class: 'declining', value: .2 }] }
  let data = payload
  globalThis.fetch = async url => { calls++; assert.equal(url, '/api/forecast/official-vn30-preview?horizon=5'); return { ok: true, json: async () => ({ success: true, data }) } }
  try {
    assert.equal((await fetchOfficialVn30Preview(5)).status, 'official_vn30_preview')
    for (const override of [{ live: true }, { universe: 'FPT,HPG,VHM' }, { publication_permitted: true }, { horizon_sessions: 1 }, { coverage: { universe: 30, observed: 28, history_sessions: 60 } }, { input_sha256: null }]) {
      data = { ...payload, ...override }
      assert.equal((await fetchOfficialVn30Preview(5)).reason, 'invalid_contract')
    }
    data = { ...payload, status: 'unavailable', reason: 'member_history_coverage_below_threshold' }
    assert.equal((await fetchOfficialVn30Preview(5)).probabilities, undefined)
    assert.equal(calls, 8)
  } finally { globalThis.fetch = originalFetch; globalThis.__VITE_ENABLE_FORECAST_LIVE__ = originalFlag }
})
