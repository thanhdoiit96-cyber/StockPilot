import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchOfficialVn30Readiness } from './officialVn30Readiness.mjs'

test('retains the unavailable state when membership has not been sealed', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ data: { status: 'unavailable', reason: 'membership_snapshot_unavailable', index_code: 'VN30', constituents: [] } }) })
  try {
    assert.deepEqual(await fetchOfficialVn30Readiness(), { status: 'unavailable', reason: 'membership_snapshot_unavailable', distribution: 'internal_research_only', publicationPermitted: false, rightsVerification: null, sessionDate: null, coverage: null, membership: null })
  } finally { globalThis.fetch = originalFetch }
})

test('keeps the shadow-only EOD coverage contract', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ data: { status: 'ready_for_shadow', as_of: '2026-10-21', research_only: true, coverage: { observed: 29, universe: 30, ratio: .966667, minimum: .95 }, membership: { source_identifier: 'hose' } } }) })
  try {
    assert.deepEqual(await fetchOfficialVn30Readiness(), { status: 'ready_for_shadow', reason: null, distribution: 'internal_research_only', publicationPermitted: false, rightsVerification: null, sessionDate: '2026-10-21', coverage: { observed: 29, universe: 30, ratio: .966667, minimum: .95 }, membership: { source_identifier: 'hose' } })
  } finally { globalThis.fetch = originalFetch }
})
