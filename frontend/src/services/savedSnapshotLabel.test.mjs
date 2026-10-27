import test from 'node:test'
import assert from 'node:assert/strict'
import { savedSnapshotLabel } from './savedSnapshotLabel.mjs'
test('labels saved snapshots with Vietnam time and localized symbol count', () => {
  const snapshot = { createdAt: '2026-10-21T00:00:00Z', result: { recommendations: [{}, {}] } }
  assert.match(savedSnapshotLabel(snapshot), /07:00:00/)
  assert.match(savedSnapshotLabel(snapshot), /2 mã$/)
  assert.match(savedSnapshotLabel(snapshot, 'en'), /7:00:00 AM/)
  assert.match(savedSnapshotLabel(snapshot, 'en'), /2 symbols$/)
})
test('invalid or missing dates stay unavailable, not current time', () => {
  assert.equal(savedSnapshotLabel({ createdAt: 'invalid' }), 'Chưa có thời điểm · 0 mã')
  assert.equal(savedSnapshotLabel(null, 'en'), 'Time unavailable · 0 symbols')
})
test('accepts persisted snake-case creation time and preserves seconds', () => {
  assert.match(savedSnapshotLabel({ created_at: '2026-10-21T10:11:05Z' }), /17:11:05/)
})
