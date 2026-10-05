import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filterPositions } from './positionSearch.mjs'

const rows = [{ symbol: 'FPT', name: 'Công nghệ FPT' }, { symbol: 'HPG', name: 'Hòa Phát' }, { symbol: 'DXG', name: 'Đất Xanh' }]
test('position search matches symbols and Vietnamese names without accents', () => {
  assert.deepEqual(filterPositions(rows, ' fPt '), [rows[0]])
  assert.deepEqual(filterPositions(rows, 'hoa phat'), [rows[1]])
  assert.deepEqual(filterPositions(rows, 'dat DXG'), [rows[2]])
})
test('empty and unmatched searches preserve source rows and tolerate missing names', () => {
  assert.deepEqual(filterPositions(rows, '  '), rows)
  assert.deepEqual(filterPositions(rows, 'missing'), [])
  assert.deepEqual(filterPositions([{ symbol: 'FPT' }], 'fpt'), [{ symbol: 'FPT' }])
  assert.equal(rows.length, 3)
})
