import test from 'node:test'
import assert from 'node:assert/strict'
import { serializeRecommendationCsv } from './recommendationCsv.mjs'

test('recommendation CSV is UTF-8 BOM encoded, keeps useful fields, and neutralizes spreadsheet formulas', () => {
  const csv = serializeRecommendationCsv({
    criteriaWeights: { trend: 30, momentum: 25 },
    criteriaDefinitions: [{ key: 'trend', label: 'Trend' }],
    generatedAt: '2026-10-08T02:45:00.000Z',
    recommendations: [{ rank: 1, symbol: '=FPT', name: 'FPT "Corporation"', score: 83.2, entry_price: 121000, horizon_days: 20, rationale: {
      model: 'personalized_rule_v1', trend: 'above_sma20', factors: ['=Formula-like rationale'], indicators: { rsi14: 55, momentum10: 3.2 }, volatility_pct: 1.25, average_volume: 2500000, observations: 90,
      reference_plan: { price_source: 'intraday', observed_at: '2026-10-08T02:40:00.000Z' },
      evidence: { sources: [{ source: 'Verified Wire', title: 'FPT update', source_url: 'https://example.com/fpt', published_at: '2026-10-08T01:00:00.000Z' }, { source: 'Unsafe', title: 'ignore', source_url: 'javascript:alert(1)', published_at: '2026-10-08T01:00:00.000Z' }] },
    } }],
  })
  assert.ok(csv.startsWith('\uFEFF'))
  assert.match(csv, /"Mã"/)
  assert.match(csv, /"'=FPT"/)
  assert.match(csv, /"FPT ""Corporation"""/)
  assert.match(csv, /"'=Formula-like rationale"/)
  assert.match(csv, /Verified Wire/)
  assert.doesNotMatch(csv, /Unsafe|javascript:/)
})
