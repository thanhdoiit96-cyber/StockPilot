import test from 'node:test'
import assert from 'node:assert/strict'
import { deriveRecommendationView, resolveOverviewRecommendations } from './recommendationView.mjs'

test('prefers a fresh generated result over stale initial data', () => {
  const view = deriveRecommendationView({
    result: { recommendations: [{ symbol: 'FPT' }] },
    initialData: { run: { as_of: '2026-10-08', created_at: '2026-10-08T08:00:00+07:00' }, recommendations: [{ symbol: 'AAA' }] },
    now: '2026-10-09T10:00:00+07:00',
  })

  assert.deepEqual(view.recommendations.map(item => item.symbol), ['FPT'])
})

test('keeps the latest EOD snapshot visible while marking it as stale', () => {
  const view = deriveRecommendationView({
    initialData: { run: { as_of: '2026-10-08', created_at: '2026-10-08T08:00:00+07:00' }, recommendations: [{ symbol: 'AAA' }] },
    now: '2026-10-09T10:00:00+07:00',
  })

  assert.deepEqual(view.recommendations.map(item => item.symbol), ['AAA'])
  assert.equal(view.expiredInitialData, true)
})

test('prefers freshly generated overview recommendations over stale scheduled recommendations', () => {
  const recommendations = resolveOverviewRecommendations({
    latestRecommendations: [{ symbol: 'AAA' }, { symbol: 'BBB' }, { symbol: 'CCC' }],
    generatedRecommendations: [{ symbol: 'FPT' }, { symbol: 'HPG' }],
  })

  assert.deepEqual(recommendations.map(item => item.symbol), ['FPT', 'HPG'])
})
