import test from 'node:test'
import assert from 'node:assert/strict'
import { recommendationSignal } from './recommendationSignal.mjs'
test('requires explicit valid outcome eligibility and separates absent, pending and excluded evidence', () => {
  assert.equal(recommendationSignal({ outcome: 'positive', forward_return_pct: 5 }).state, 'untracked')
  assert.equal(recommendationSignal({ measurement_status: 'pending' }).state, 'pending')
  assert.equal(recommendationSignal({ measurement_status: 'excluded', forward_return_pct: -20 }).returnPct, null)
  assert.equal(recommendationSignal({ measurement_status: 'eligible', statistics_eligible: true, forward_return_pct: -20 }).returnPct, -20)
  assert.equal(recommendationSignal({ measurement_status: 'eligible', statistics_eligible: true, forward_return_pct: null }).state, 'untracked')
})
test('explains relative criterion scores without inventing unavailable factors or thresholds', () => {
  const criteria = ['trend', 'momentum', 'liquidity', 'stability'].map(key => ({ key, label: key }))
  const result = recommendationSignal({ rationale: { score_parts: { trend: 90, momentum: 70, liquidity: 40, stability: null } }, horizon_days: 20 }, criteria)
  assert.deepEqual(result.supporting.map(item => item.key), ['trend', 'momentum'])
  assert.equal(result.review.key, 'liquidity')
  assert.equal(result.horizon, 20)
  assert.deepEqual(recommendationSignal({}, criteria).supporting, [])
})
