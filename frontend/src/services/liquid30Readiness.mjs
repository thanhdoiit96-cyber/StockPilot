export async function fetchLiquid30Readiness({ signal } = {}) {
  const response = await fetch('/api/stocks/data-quality', { signal, credentials: 'same-origin', headers: { Accept: 'application/json' } })
  if (!response.ok) return { status: 'unavailable' }
  const data = (await response.json())?.data
  if (!Number.isInteger(data?.listed) || !Number.isInteger(data?.covered) || !Number.isFinite(Number(data?.coverage_pct)) || !Array.isArray(data?.exchange_coverage)) return { status: 'unavailable' }
  const partial = Number(data.coverage_pct) >= 65 && Number(data.coverage_pct) < 95
  return { status: Number(data.coverage_pct) >= 95 ? 'ready' : partial ? 'partial_observed_universe' : 'unavailable', session_date: data.session_date, listed: data.listed, covered: data.covered, coverage_pct: Number(data.coverage_pct), exchange_coverage: data.exchange_coverage }
}
