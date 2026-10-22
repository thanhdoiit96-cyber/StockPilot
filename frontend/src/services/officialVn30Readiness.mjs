export async function fetchOfficialVn30Readiness({ signal } = {}) {
  const response = await fetch('/api/stocks/vn30-readiness', { signal, credentials: 'same-origin', headers: { Accept: 'application/json' } })
  const payload = await response.json().catch(() => null)
  if (!response.ok) return { status: payload?.code === 'market_vn30_readiness_failed' ? 'endpoint_unavailable' : 'unavailable' }
  const data = payload?.data
  if (!['ready_for_shadow', 'unavailable'].includes(data?.status)) return { status: 'unavailable' }
  const coverage = data?.coverage
  return {
    status: data.status,
    reason: data.reason || null,
    sessionDate: data.as_of || null,
    coverage: Number.isInteger(coverage?.observed) && Number.isInteger(coverage?.universe) ? coverage : null,
    membership: data.membership || null
  }
}
