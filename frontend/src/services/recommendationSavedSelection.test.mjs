import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLatestSavedSnapshot } from './recommendationSavedSelection.mjs';

test('prefers the newest saved snapshot even when an older one is currently selected', () => {
  const snapshots = [
    { id: 'older', createdAt: '2026-10-01T09:00:00.000Z', result: { recommendations: [{ symbol: 'AAA' }] } },
    { id: 'latest', createdAt: '2026-10-15T09:00:00.000Z', result: { recommendations: [{ symbol: 'BBB' }] } }
  ];

  const resolved = resolveLatestSavedSnapshot(snapshots, 'older');
  assert.equal(resolved.id, 'latest');
});

test('keeps the current selection if it is already the newest snapshot', () => {
  const snapshots = [
    { id: 'latest', createdAt: '2026-10-15T09:00:00.000Z', result: { recommendations: [{ symbol: 'BBB' }] } },
    { id: 'older', createdAt: '2026-10-01T09:00:00.000Z', result: { recommendations: [{ symbol: 'AAA' }] } }
  ];

  const resolved = resolveLatestSavedSnapshot(snapshots, 'latest');
  assert.equal(resolved.id, 'latest');
});
