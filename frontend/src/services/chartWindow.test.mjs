import test from 'node:test'
import assert from 'node:assert/strict'
import { getChartWindow } from './chartWindow.mjs'

test('returns the latest bounded chart window by default', () => {
  const result = getChartWindow([1, 2, 3, 4, 5], 3)
  assert.deepEqual(result.items, [3, 4, 5])
  assert.deepEqual({ start: result.start, end: result.end, hasOlder: result.hasOlder, hasNewer: result.hasNewer }, { start: 2, end: 5, hasOlder: true, hasNewer: false })
})

test('clamps pan offset and size without fabricating sessions', () => {
  const older = getChartWindow([1, 2, 3, 4, 5], 3, 2)
  assert.deepEqual(older.items, [1, 2, 3])
  assert.equal(older.hasOlder, false)
  assert.equal(older.hasNewer, true)
  assert.deepEqual(getChartWindow([1, 2], 20, 99).items, [1, 2])
})
