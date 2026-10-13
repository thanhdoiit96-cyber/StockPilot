const CLASSES = ['advancing', 'balanced', 'declining']

export async function fetchForecastLiveCohort(horizon, { signal, minimumSamples = 20 } = {}) {
  if (![1, 5].includes(horizon)) throw new Error('invalid_horizon')
  const response = await fetch(`/api/forecast/live-cohort?horizon=${horizon}&minimum_samples=${minimumSamples}`, { signal, credentials:'same-origin', headers:{ Accept:'application/json' } })
  if (!response.ok) return { status:'unavailable', reason:response.status === 404 ? 'preview_disabled' : 'request_failed' }
  const data = (await response.json())?.data
  const valid = data?.version === 'forecast_live_cohort_summary_v1' && data.status === 'live_cohort' && data.synthetic === false && data.research_only === false && data.live === true
    && data.market_accuracy_verified === false && data.horizon_sessions === horizon && data.minimum_samples === minimumSamples
    && Number.isInteger(data.predictions) && Number.isInteger(data.measured) && Number.isInteger(data.pending) && data.predictions === data.measured + data.pending
    && ['insufficient_samples','awaiting_baseline'].includes(data.score_gate?.status) && data.score_gate.samples === data.measured
  return valid ? data : { status:'unavailable', reason:'invalid_contract' }
}

export async function fetchForecastResearchHistory(horizon, { signal, cursor, limit = 7 } = {}) {
  if (![1, 5].includes(horizon)) throw new Error('invalid_horizon')
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error('invalid_limit')
  const query = new URLSearchParams({ horizon: String(horizon), limit: String(limit) }); if (cursor) query.set('cursor', cursor)
  const response = await fetch(`/api/forecast/research-history?${query}`, { signal, credentials: 'same-origin', headers: { Accept: 'application/json' } })
  if (!response.ok) return { status: 'unavailable', reason: response.status === 404 ? 'preview_disabled' : 'request_failed' }
  const data = (await response.json())?.data
  const summary = data?.summary
  const valid = data?.status === 'research_history' && data.source === 'snapshot_store' && data.synthetic === true && data.research_only === true && data.live === false
    && data.market_accuracy_verified === false && data.calibrated === false && data.horizon_sessions === horizon
    && Number.isInteger(summary?.predictions) && Number.isInteger(summary?.measured) && Number.isInteger(summary?.pending)
    && summary.predictions === summary.measured + summary.pending && Array.isArray(data.entries) && data.entries.length === summary.predictions
    && Array.isArray(data.reliability?.bins) && data.reliability?.interpretation === 'diagnostic_only_not_calibration'
    && typeof data.pagination?.has_more === 'boolean' && (!data.pagination.has_more || typeof data.pagination.next_cursor === 'string')
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

export async function fetchForecastResearchCohorts(horizon, { signal, minimumSamples = 20 } = {}) {
  if (![1, 5].includes(horizon)) throw new Error('invalid_horizon')
  if (!Number.isInteger(minimumSamples) || minimumSamples < 2 || minimumSamples > 1000) throw new Error('invalid_minimum_samples')
  const query = new URLSearchParams({ horizon: String(horizon), minimum_samples: String(minimumSamples) })
  const response = await fetch(`/api/forecast/research-cohorts?${query}`, { signal, credentials: 'same-origin', headers: { Accept: 'application/json' } })
  if (!response.ok) return { status: 'unavailable', reason: response.status === 404 ? 'preview_disabled' : 'request_failed' }
  const data = (await response.json())?.data
  const validCoverage = coverage => Number.isInteger(coverage?.v1?.predictions) && Number.isInteger(coverage?.v1?.measured)
    && Number.isInteger(coverage?.v2?.predictions) && Number.isInteger(coverage?.v2?.measured) && Number.isInteger(coverage?.baseline_eligible_measured)
    && coverage.v1.measured <= coverage.v1.predictions && coverage.v2.measured <= coverage.v2.predictions && coverage.baseline_eligible_measured === coverage.v2.measured
  const validComparison = comparison => comparison?.status === 'insufficient_samples'
    ? Number.isInteger(comparison.samples) && comparison.samples < data.minimum_samples
    : comparison?.status === 'available' && Number.isInteger(comparison.samples) && comparison.samples >= data.minimum_samples
      && ['model', 'frequency', 'persistence'].every(key => Number.isFinite(comparison[key]?.brier_multiclass_sum) && Number.isFinite(comparison[key]?.log_loss))
      && Number.isFinite(comparison.frequency.brier_delta) && Number.isFinite(comparison.frequency.log_loss_delta)
  const validCohort = cohort => [1, 5].includes(cohort?.dimensions?.horizon_sessions) && cohort.dimensions.horizon_sessions === horizon
    && typeof cohort.dimensions.model_version === 'string' && typeof cohort.dimensions.provider === 'string'
    && Number.isInteger(cohort.predictions) && Number.isInteger(cohort.measured) && Number.isInteger(cohort.pending)
    && cohort.predictions === cohort.measured + cohort.pending && validCoverage(cohort.coverage) && validComparison(cohort.baseline_comparison)
  const valid = data?.version === 'forecast_cohort_summary_v1' && data.source === 'snapshot_store' && data.synthetic === true && data.research_only === true
    && data.live === false && data.market_accuracy_verified === false && data.minimum_samples === minimumSamples && Number.isInteger(data.total_rows)
    && Array.isArray(data.cohorts) && data.cohorts.every(validCohort) && Array.isArray(data.monthly_cohorts) && data.monthly_cohorts.every(validCohort)
    && data.cohorts.reduce((sum, cohort) => sum + cohort.predictions, 0) === data.total_rows
  return valid ? { ...data, status: 'research_cohorts' } : { status: 'unavailable', reason: 'invalid_contract' }
}

export function mergeForecastHistory(current, next) {
  if (current?.status !== 'research_history' || next?.status !== 'research_history' || current.horizon_sessions !== next.horizon_sessions) return next
  const entries = [...current.entries, ...next.entries].filter((entry, index, rows) => rows.findIndex(item => (item.id || item.as_of) === (entry.id || entry.as_of)) === index)
  const measured = entries.filter(entry => entry.outcome_status === 'measured')
  const mean = key => measured.length ? measured.reduce((sum, entry) => sum + entry[key], 0) / measured.length : null
  const bins = [[0, .5], [.5, .7], [.7, .85], [.85, 1.0000001]].map(([lower, upper], index) => {
    const rows = measured.filter(entry => entry.confidence >= lower && entry.confidence < upper)
    return { bin_index: index, samples: rows.length, status: rows.length >= 5 ? 'observed' : 'insufficient_samples' }
  })
  return { ...next, entries, summary: { ...next.summary, predictions: entries.length, measured: measured.length, pending: entries.length - measured.length,
    brier_multiclass_sum: mean('brier_multiclass_sum'), log_loss: mean('log_loss'), accuracy: measured.length ? measured.filter(entry => entry.correct).length / measured.length : null },
    reliability: { ...next.reliability, bins } }
}
