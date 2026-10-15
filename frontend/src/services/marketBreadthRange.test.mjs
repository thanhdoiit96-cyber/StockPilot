import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_MARKET_BREADTH_HISTORY_RANGE, MARKET_BREADTH_HISTORY_RANGES } from './marketBreadthRange.mjs'

test('market breadth default history range is 20 sessions and includes 30-day option', () => {
  assert.equal(DEFAULT_MARKET_BREADTH_HISTORY_RANGE, 20)
  assert.deepEqual(MARKET_BREADTH_HISTORY_RANGES, [1, 5, 20, 30])
})
