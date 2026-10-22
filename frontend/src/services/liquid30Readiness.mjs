export async function fetchLiquid30Readiness({ signal } = {}) {
  const response = await fetch('/api/stocks/liquid30-readiness', { signal, credentials: 'same-origin', headers: { Accept: 'application/json' } })
  const payload = await response.json().catch(() => null)
  if (!response.ok) return { status: payload?.code === 'market_detail_failed' ? 'endpoint_unavailable' : 'unavailable' }
  const data = payload?.data
  if (!['ready', 'partial_observed_universe', 'unavailable'].includes(data?.status)) return { status: 'unavailable' }
  const coverage = data?.coverage
  if (!Number.isInteger(coverage?.observed) || !Number.isInteger(coverage?.universe) || !Number.isFinite(Number(coverage?.ratio))) return { status: 'unavailable' }
  return {
    status: data.status,
    session_date: data.as_of,
    listed: coverage.universe,
    covered: coverage.observed,
    coverage_pct: Number((Number(coverage.ratio) * 100).toFixed(1)),
    scope: data.scope,
    research_only: data.research_only === true,
    constituents: Array.isArray(data.constituents) ? data.constituents : []
  }
}
