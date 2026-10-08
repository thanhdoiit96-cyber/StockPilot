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
