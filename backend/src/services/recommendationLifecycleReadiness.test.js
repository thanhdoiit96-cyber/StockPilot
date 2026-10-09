const { lifecycleReadiness } = require('./recommendationLifecycleReadiness');

test.each([
  [{ expectedSession: '2026-10-09', latestEodSession: '2026-10-08' }, 'awaiting_eod'],
  [{ expectedSession: '2026-10-09', latestEodSession: '2026-10-09' }, 'ready_to_generate'],
  [{ expectedSession: '2026-10-09', latestEodSession: '2026-10-09', run: { id: 'r', as_of: '2026-10-09' } }, 'snapshot_missing_hash'],
  [{ expectedSession: '2026-10-09', latestEodSession: '2026-10-09', run: { id: 'r', as_of: '2026-10-09', snapshot_sha256: 'x' }, integrity: { valid: false } }, 'snapshot_integrity_failed'],
  [{ expectedSession: '2026-10-09', latestEodSession: '2026-10-09', run: { id: 'r', as_of: '2026-10-09', snapshot_sha256: 'x' }, integrity: { valid: true } }, 'ready_to_evaluate'],
])('reports %s', (input, status) => expect(lifecycleReadiness(input).status).toBe(status));
