import test from 'node:test'
import assert from 'node:assert/strict'
import { sortPositions } from './positionView.mjs'

const entries = [
  { symbol: 'VCB', market_value: 200, unrealized_pnl: 10 },
  { symbol: 'FPT', market_value: 500, unrealized_pnl: -20 },
  { symbol: 'ACB', market_value: 300, unrealized_pnl: 40 }
]

test('sorts positions by symbol, value and unrealized pnl without mutating source', () => {
  assert.deepEqual(sortPositions(entries).map(item => item.symbol), ['ACB', 'FPT', 'VCB'])
  assert.deepEqual(sortPositions(entries, 'value').map(item => item.symbol), ['FPT', 'ACB', 'VCB'])
  assert.deepEqual(sortPositions(entries, 'pnl').map(item => item.symbol), ['ACB', 'VCB', 'FPT'])
  assert.equal(entries[0].symbol, 'VCB')
})
