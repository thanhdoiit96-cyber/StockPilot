import test from 'node:test'
import assert from 'node:assert/strict'
import { resourcesForView, viewNeedsResource } from './pageResourcePolicy.mjs'

test('overview avoids page-specific history and AI requests', () => {
  assert.equal(viewNeedsResource('overview', 'stocks'), true)
  assert.equal(viewNeedsResource('overview', 'latestRecommendations'), true)
  assert.equal(viewNeedsResource('overview', 'recommendationHistory'), false)
  assert.equal(viewNeedsResource('overview', 'aiGate'), false)
})

test('recommendations and advisor request only their page dependencies', () => {
  assert.deepEqual([...resourcesForView('recommendations')], ['latestRecommendations', 'recommendationHistory'])
  assert.deepEqual([...resourcesForView('advisor')], ['stocks', 'aiGate'])
})

test('market board owns its request lifecycle', () => {
  assert.equal(resourcesForView('market-board').size, 0)
})
