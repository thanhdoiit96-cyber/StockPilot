import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchLiquid30Readiness } from './liquid30Readiness.mjs'

test('reports an old backend route as unavailable contract instead of insufficient EOD', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => ({ ok: false, json: async () => ({ code: 'market_detail_failed' }) })
  try {
    assert.deepEqual(await fetchLiquid30Readiness(), { status: 'endpoint_unavailable' })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('keeps observed-subset provenance from the backend contract', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ data: {
    status: 'partial_observed_universe', as_of: '2026-10-21', scope: 'observed_eod_subset', research_only: true,
    coverage: { observed: 357, universe: 549, ratio: .650273, minimum: .65 }, constituents: [{ symbol: 'FPT' }]
  } }) })
  try {
    assert.deepEqual(await fetchLiquid30Readiness(), {
      status: 'partial_observed_universe', session_date: '2026-10-21', listed: 549, covered: 357, coverage_pct: 65,
      scope: 'observed_eod_subset', research_only: true, constituents: [{ symbol: 'FPT' }]
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})
