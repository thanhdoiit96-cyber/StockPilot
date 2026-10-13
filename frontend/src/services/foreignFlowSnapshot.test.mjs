import test from 'node:test'
import assert from 'node:assert/strict'
import { foreignFlowSnapshot, shouldShowForeignFlow } from './foreignFlowSnapshot.mjs'

const base = { version: 'foreign_flow_snapshot_v1', status: 'unavailable', coverage: { observed: 0, universe_size: 551, ratio: 0 }, totals: null, sectors: [], symbols: [], policy: { scored: false } }
test('unavailable foreign flow validates but remains hidden', () => {
  const data = foreignFlowSnapshot({ success: true, data: base })
  assert.equal(shouldShowForeignFlow(data), false)
})
test('observed partial flow is visible while remaining unscored', () => {
  const data = foreignFlowSnapshot({ success: true, data: { ...base, status: 'partial', coverage: { observed: 1, universe_size: 2, ratio: .5 }, totals: { net_value: 10 }, symbols: [{ symbol: 'FPT' }] } })
  assert.equal(shouldShowForeignFlow(data), true)
  assert.equal(data.policy.scored, false)
})
test('rejects unavailable response with fabricated totals', () => assert.throws(() => foreignFlowSnapshot({ success: true, data: { ...base, totals: { net_value: 0 } } })))
