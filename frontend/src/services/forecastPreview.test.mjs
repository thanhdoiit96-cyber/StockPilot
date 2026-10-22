import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchForecastResearchPreview, fetchForecastCurrentPreview } from './forecastPreview.mjs'
import { forecastBreadthTarget } from './forecastBreadth.mjs'
test('requires an explicit opt-in before loading the synthetic research replay', async t => {
  const originalFetch = global.fetch; const originalFlag = globalThis.__VITE_ENABLE_FORECAST_RESEARCH__
  t.after(() => { global.fetch = originalFetch; globalThis.__VITE_ENABLE_FORECAST_RESEARCH__ = originalFlag })
  globalThis.__VITE_ENABLE_FORECAST_RESEARCH__ = 'false'
  const result = await fetchForecastResearchPreview(5)
  assert.equal(result.status, 'unavailable')
  assert.equal(result.reason, 'preview_disabled')
})
test('accepts only the explicitly synthetic research contract', async t => {
  const originalFetch = global.fetch; const originalFlag = globalThis.__VITE_ENABLE_FORECAST_RESEARCH__
  t.after(() => { global.fetch = originalFetch; globalThis.__VITE_ENABLE_FORECAST_RESEARCH__ = originalFlag })
  globalThis.__VITE_ENABLE_FORECAST_RESEARCH__ = 'true'
  global.fetch = async () => ({ ok: true, json: async () => ({ data: { status: 'research_preview', synthetic: true, research_only: true, live: false, market_accuracy_verified: false, horizon_sessions: 5, artifact_sha256: 'a'.repeat(64), artifact_generated_at: '2026-10-12T06:00:00Z', artifact_freshness: 'fresh', artifact_age_seconds: 30, breadth_target: forecastBreadthTarget, probabilities: [{ class: 'declining', value: .2 }, { class: 'advancing', value: .5 }, { class: 'balanced', value: .3 }] } }) })
  const result = await fetchForecastResearchPreview(5)
  assert.equal(result.status, 'research_preview')
  assert.deepEqual(result.probabilities.map(item => item.class), ['advancing', 'balanced', 'declining'])
})
test('fails closed for live-shaped, malformed and disabled responses', async t => {
  const originalFetch = global.fetch; const originalFlag = globalThis.__VITE_ENABLE_FORECAST_RESEARCH__
  t.after(() => { global.fetch = originalFetch; globalThis.__VITE_ENABLE_FORECAST_RESEARCH__ = originalFlag })
  globalThis.__VITE_ENABLE_FORECAST_RESEARCH__ = 'true'
  global.fetch = async () => ({ ok: true, json: async () => ({ data: { status: 'research_preview', synthetic: true, research_only: true, live: true, market_accuracy_verified: false, horizon_sessions: 1, probabilities: [] } }) })
  assert.equal((await fetchForecastResearchPreview(1)).reason, 'invalid_contract')
  global.fetch = async () => ({ ok: false, status: 404 })
  assert.equal((await fetchForecastResearchPreview(1)).reason, 'preview_disabled')
})

test('loads a valid current-data preview only when the live flag is explicitly enabled', async t => {
  const originalFetch = global.fetch; const originalLiveFlag = globalThis.__VITE_ENABLE_FORECAST_LIVE__
  t.after(() => { global.fetch = originalFetch; globalThis.__VITE_ENABLE_FORECAST_LIVE__ = originalLiveFlag })
  globalThis.__VITE_ENABLE_FORECAST_LIVE__ = 'true'
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      success: true,
      data: {
        status: 'live_preview',
        mode: 'live',
        source: 'live_provider',
        provider: 'vnstock',
        as_of: '2026-10-12T00:00:00Z',
        fetched_at: '2026-10-12T06:00:00Z',
        staleness_days: 0.1,
        maximum_staleness_days: 7,
        live: true,
        synthetic: false,
        research_only: false,
        market_accuracy_verified: false,
        horizon_sessions: 5,
        validation: { status: 'monitoring', current_data_ready: true, evidence_integrity: true, coverage_ok: true, minimum_samples_ok: true, staleness_ok: true, calibration_validated: false, independent_audit_validated: false, provider_validation_completed: false, market_accuracy_verified: false },
        breadth_target: forecastBreadthTarget,
        probabilities: [{ class: 'declining', value: .2 }, { class: 'advancing', value: .5 }, { class: 'balanced', value: .3 }]
      }
    })
  })
  const result = await fetchForecastCurrentPreview(['FPT'])
  assert.equal(result.status, 'live_preview')
  assert.equal(result.live, true)
  assert.deepEqual(result.probabilities.map(item => item.class), ['advancing', 'balanced', 'declining'])
})
test('fails closed when the live preview omits its market-validation disclosure', async t => {
  const originalFetch = global.fetch; const originalLiveFlag = globalThis.__VITE_ENABLE_FORECAST_LIVE__
  t.after(() => { global.fetch = originalFetch; globalThis.__VITE_ENABLE_FORECAST_LIVE__ = originalLiveFlag })
  globalThis.__VITE_ENABLE_FORECAST_LIVE__ = 'true'
  global.fetch = async () => ({ ok: true, json: async () => ({ success: true, data: { status: 'live_preview', mode: 'live', provider: 'vnstock', as_of: '2026-10-12T00:00:00Z', live: true, synthetic: false, research_only: false, market_accuracy_verified: false, horizon_sessions: 5, breadth_target: forecastBreadthTarget, probabilities: [{ class: 'declining', value: .2 }, { class: 'advancing', value: .5 }, { class: 'balanced', value: .3 }] } }) })
  assert.equal((await fetchForecastCurrentPreview(['FPT'])).reason, 'invalid_contract')
})
