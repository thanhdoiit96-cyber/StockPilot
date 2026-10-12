const CLASSES = ['advancing', 'balanced', 'declining']

export async function fetchForecastResearchHistory(horizon, { signal } = {}) {
  if (![1, 5].includes(horizon)) throw new Error('invalid_horizon')
  const response = await fetch(`/api/forecast/research-history?horizon=${horizon}`, { signal, credentials: 'same-origin', headers: { Accept: 'application/json' } })
  if (!response.ok) return { status: 'unavailable', reason: response.status === 404 ? 'preview_disabled' : 'request_failed' }
  const data = (await response.json())?.data
  const summary = data?.summary
  const validArtifact = /^[a-f0-9]{64}$/.test(data?.artifact_sha256 || '') && ['fresh', 'stale'].includes(data?.artifact_freshness)
  const valid = data?.status === 'research_history' && data.synthetic === true && data.research_only === true && data.live === false
    && data.market_accuracy_verified === false && data.calibrated === false && data.horizon_sessions === horizon && validArtifact
    && Number.isInteger(summary?.predictions) && Number.isInteger(summary?.measured) && Number.isInteger(summary?.pending)
    && summary.predictions === summary.measured + summary.pending && Array.isArray(data.entries) && data.entries.length === summary.predictions
    && Array.isArray(data.reliability?.bins) && data.reliability?.interpretation === 'diagnostic_only_not_calibration'
  if (!valid) return { status: 'unavailable', reason: 'invalid_contract' }
  const entriesValid = data.entries.every(entry => entry.horizon_sessions === horizon && /^\d{4}-\d{2}-\d{2}$/.test(entry.as_of)
    && ['pending', 'measured'].includes(entry.outcome_status) && CLASSES.includes(entry.predicted_class)
    && Number.isFinite(entry.confidence) && entry.confidence >= 0 && entry.confidence <= 1 && Array.isArray(entry.probabilities) && entry.probabilities.length === 3
    && new Set(entry.probabilities.map(item => item.class)).size === 3 && entry.probabilities.every(item => CLASSES.includes(item.class) && Number.isFinite(item.value) && item.value >= 0 && item.value <= 1)
    && Math.abs(entry.probabilities.reduce((sum, item) => sum + item.value, 0) - 1) < 1e-6
    && Math.abs(entry.probabilities.find(item => item.class === entry.predicted_class).value - entry.confidence) < 1e-6
    && (entry.outcome_status === 'pending' || (CLASSES.includes(entry.actual_class) && Number.isFinite(entry.brier_multiclass_sum) && Number.isFinite(entry.log_loss))))
  return entriesValid ? data : { status: 'unavailable', reason: 'invalid_entries' }
}
