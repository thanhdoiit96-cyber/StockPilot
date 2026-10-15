import test from 'node:test'
import assert from 'node:assert/strict'
import { isEodReady, shouldDeferOverviewData } from './overviewDataPolicy.mjs'

test('isEodReady only passes when the current EOD session is complete', () => {
  assert.equal(isEodReady({ ready: true, covered: 551, listed: 551, missing: 0 }), true)
  assert.equal(isEodReady({ ready: false, covered: 436, listed: 551, missing: 115 }), false)
  assert.equal(isEodReady({ ready: true, covered: 0, listed: 0, missing: 0 }), false)
  assert.equal(isEodReady(null), false)
})

test('shouldDeferOverviewData blocks heavy breadth/basket requests until EOD is ready', () => {
  assert.equal(shouldDeferOverviewData({ ready: false, covered: 436, listed: 551, missing: 115 }), false)
  assert.equal(shouldDeferOverviewData({ ready: true, covered: 551, listed: 551, missing: 0 }), false)
  assert.equal(shouldDeferOverviewData({ ready: false, covered: 0, listed: 0, missing: 0 }), true)
})
