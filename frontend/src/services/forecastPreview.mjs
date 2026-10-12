export async function fetchForecastResearchPreview(horizon, { signal } = {}) {
  if (![1, 5].includes(horizon)) throw new Error('invalid_horizon')
  const response = await fetch(`/api/forecast/research-preview?horizon=${horizon}`, { signal, credentials: 'same-origin', headers: { Accept: 'application/json' } })
  if (!response.ok) return { status: 'unavailable', reason: response.status === 404 ? 'preview_disabled' : 'request_failed' }
  const body = await response.json()
  const data = body?.data
  const validTime = typeof data?.artifact_generated_at === 'string' && Number.isFinite(Date.parse(data.artifact_generated_at))
  const validArtifact = /^[a-f0-9]{64}$/.test(data?.artifact_sha256 || '') && validTime && ['fresh', 'stale'].includes(data?.artifact_freshness) && Number.isInteger(data?.artifact_age_seconds) && data.artifact_age_seconds >= 0
  const valid = data?.status === 'research_preview' && data.synthetic === true && data.research_only === true && data.live === false && data.market_accuracy_verified === false && data.horizon_sessions === horizon && Array.isArray(data.probabilities) && validArtifact
  if (!valid) return { status: 'unavailable', reason: 'invalid_contract' }
  const values = Object.fromEntries(data.probabilities.map(item => [item.class, item.value]))
  const classes = ['advancing', 'balanced', 'declining']
  if (classes.some(name => !Number.isFinite(values[name]) || values[name] < 0 || values[name] > 1) || Math.abs(classes.reduce((sum, name) => sum + values[name], 0) - 1) > 1e-6) return { status: 'unavailable', reason: 'invalid_probabilities' }
  return { ...data, probabilities: classes.map(name => ({ class: name, value: values[name] })) }
}
