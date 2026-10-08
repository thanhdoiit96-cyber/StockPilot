import { test } from 'node:test'
import assert from 'node:assert/strict'
import { serializeRecommendationHistoryCsv } from './recommendationHistoryCsv.mjs'

test('history CSV retains snapshot provenance and leaves pending forward return blank', () => {
  const csv = serializeRecommendationHistoryCsv({
    language: 'en',
    report: {
      id: 'run-1', as_of: '2026-09-01', model: 'short_term_rule_v2', provider: 'vnstock', horizon_days: 20,
      recommendations: [
        { rank: 1, stock: { code: 'FPT', name: 'FPT' }, score: 80, entry_price: 120000, outcome: 'pending', forward_return_pct: null, rationale: { reference_plan: { price_source: 'eod', observed_at: '2026-09-01' } } },
      ],
    },
  })
  assert.match(csv, /^\uFEFF"Snapshot ID"/)
  assert.match(csv, /"run-1"/)
  assert.match(csv, /"pending","",""/)
})

test('excluded returns stay out of the verified return column with bilingual reasons', () => {
  const report = { id: 'run', recommendations: [{ outcome: 'positive', forward_return_pct: 99, measurement_status: 'excluded', statistics_eligible: false, exclusion_reasons: ['snapshot_unverified', 'insufficient_observed_sessions'] }] }
  const csv = serializeRecommendationHistoryCsv({ report, language: 'en' })
  assert.match(csv, /"excluded",""/)
  assert.match(csv, /Excluded from statistics/)
  assert.match(csv, /Original snapshot not verified; Insufficient observed price sessions/)
  assert.match(csv, /"positive","99"/)
  assert.match(serializeRecommendationHistoryCsv({ report }), /Không tính thống kê/)
})

test('eligible return is exported normally', () => {
  const csv = serializeRecommendationHistoryCsv({ report: { recommendations: [{ outcome: 'positive', forward_return_pct: 5, statistics_eligible: true, measurement_status: 'eligible' }] }, language: 'en' })
  assert.match(csv, /"positive","5"/)
  assert.match(csv, /"Eligible"/)
})
