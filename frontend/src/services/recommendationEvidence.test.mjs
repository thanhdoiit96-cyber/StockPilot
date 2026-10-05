import test from 'node:test'
import assert from 'node:assert/strict'
import { recommendationEvidence } from './recommendationEvidence.mjs'

const criteria = [{ key: 'trend', label: 'Xu hướng giá' }, { key: 'momentum', label: 'Động lượng' }]

test('projects only available recommendation provenance into drill-down evidence', () => {
  const evidence = recommendationEvidence({ rationale: { model: 'personalized_rule_v1', observations: 90, trend: 'above_sma20', indicators: { rsi14: 55 }, reference_plan: { price_source: 'intraday', observed_at: '2026-10-05T02:00:00Z' }, score_parts: { trend: 80 }, weights: { trend: 30 }, calibration: { trend: 1.1 } } }, criteria)
  assert.equal(evidence.priceSource, 'Intraday')
  assert.equal(evidence.observations, 90)
  assert.deepEqual(evidence.factors, [{ key: 'trend', label: 'Xu hướng giá', score: 80, weight: 30, calibration: 1.1 }])
})

test('uses scheduled objective observations and does not invent missing sources', () => {
  const evidence = recommendationEvidence({ rationale: { evidence: { objective: { observations: 60 } }, reference_plan: {} } }, criteria)
  assert.equal(evidence.observations, 60)
  assert.equal(evidence.priceSource, null)
  assert.deepEqual(evidence.factors, [])
})

test('keeps only dated verified HTTP citations projected by the backend', () => {
  const evidence = recommendationEvidence({ rationale: { evidence: { sources: [
    { source: 'World Bank', title: 'Report', source_url: 'https://example.com/report', published_at: '2026-10-01T00:00:00Z', type: 'macro' },
    { source: 'Unsafe', source_url: 'javascript:alert(1)', published_at: '2026-10-01T00:00:00Z' }
  ] } } }, criteria)
  assert.deepEqual(evidence.sources, [{ type: 'macro', source: 'World Bank', title: 'Report', url: 'https://example.com/report', publishedAt: '2026-10-01T00:00:00Z' }])
})
