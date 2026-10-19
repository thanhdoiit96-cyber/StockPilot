import test from 'node:test'
import assert from 'node:assert/strict'
import { resourcesForView, viewNeedsResource } from './pageResourcePolicy.mjs'

test('overview avoids page-specific history and AI requests', () => {
  assert.equal(viewNeedsResource('overview', 'stocks'), true)
  assert.equal(viewNeedsResource('overview', 'latestRecommendations'), true)
  assert.equal(viewNeedsResource('overview', 'recommendationHistory'), false)
  assert.equal(viewNeedsResource('overview', 'aiGate'), false)
})

test('recommendation and advisor pages own their local requests', () => {
  assert.deepEqual([...resourcesForView('recommendations')], [])
  assert.deepEqual([...resourcesForView('advisor')], ['stocks'])
})

test('market board owns its request lifecycle', () => {
  assert.equal(resourcesForView('market-board').size, 0)
})
