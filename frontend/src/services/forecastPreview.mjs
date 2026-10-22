import { isForecastBreadthTarget } from './forecastBreadth.mjs'

function isResearchPreviewEnabled() {
  const globalValue = typeof globalThis !== 'undefined' ? String(globalThis.__VITE_ENABLE_FORECAST_RESEARCH__ || '') : ''
  const raw = globalValue || (typeof import.meta !== 'undefined' && import.meta?.env ? String(import.meta.env.VITE_ENABLE_FORECAST_RESEARCH || '') : '')
  return raw.toLowerCase() === 'true'
}

function isCurrentPreviewEnabled() {
  const globalValue = typeof globalThis !== 'undefined' ? String(globalThis.__VITE_ENABLE_FORECAST_LIVE__ || '') : ''
  const raw = globalValue || (typeof import.meta !== 'undefined' && import.meta?.env ? String(import.meta.env.VITE_ENABLE_FORECAST_LIVE || '') : '')
  return raw.toLowerCase() === 'true'
}

export async function fetchForecastResearchPreview(horizon, { signal } = {}) {
  if (![1, 5].includes(horizon)) throw new Error('invalid_horizon')
  if (!isResearchPreviewEnabled()) return { status: 'unavailable', reason: 'preview_disabled' }
  const response = await fetch(`/api/forecast/research-preview?horizon=${horizon}`, { signal, credentials: 'same-origin', headers: { Accept: 'application/json' } })
  if (!response.ok) return { status: 'unavailable', reason: response.status === 404 ? 'preview_disabled' : 'request_failed' }
  const body = await response.json()
  const data = body?.data
  const validTime = typeof data?.artifact_generated_at === 'string' && Number.isFinite(Date.parse(data.artifact_generated_at))
  const validArtifact = /^[a-f0-9]{64}$/.test(data?.artifact_sha256 || '') && validTime && ['fresh', 'stale'].includes(data?.artifact_freshness) && Number.isInteger(data?.artifact_age_seconds) && data.artifact_age_seconds >= 0
  const valid = data?.status === 'research_preview' && data.synthetic === true && data.research_only === true && data.live === false && data.market_accuracy_verified === false && data.horizon_sessions === horizon && Array.isArray(data.probabilities) && validArtifact && isForecastBreadthTarget(data.breadth_target)
  if (!valid) return { status: 'unavailable', reason: 'invalid_contract' }
  const values = Object.fromEntries(data.probabilities.map(item => [item.class, item.value]))
  const classes = ['advancing', 'balanced', 'declining']
  if (classes.some(name => !Number.isFinite(values[name]) || values[name] < 0 || values[name] > 1) || Math.abs(classes.reduce((sum, name) => sum + values[name], 0) - 1) > 1e-6) return { status: 'unavailable', reason: 'invalid_probabilities' }
  return { ...data, probabilities: classes.map(name => ({ class: name, value: values[name] })) }
}

export async function fetchForecastCurrentPreview(symbols = ['FPT', 'HPG', 'VHM'], { signal, horizon = 5 } = {}) {
  if (!isCurrentPreviewEnabled()) return { status: 'unavailable', reason: 'preview_disabled' }
  if (![1, 5].includes(horizon)) throw new Error('invalid_horizon')
  const query = new URLSearchParams({ symbols: Array.from(new Set(symbols)).filter(Boolean).join(',') || 'FPT,HPG,VHM', horizon: String(horizon) })
  const response = await fetch(`/api/forecast/live-preview?${query.toString()}`, { signal, credentials: 'same-origin', headers: { Accept: 'application/json' } })
  if (!response.ok) return { status: 'unavailable', reason: response.status === 404 ? 'preview_disabled' : 'request_failed' }
  const body = await response.json()
  const data = body?.data
  const classes = ['advancing', 'balanced', 'declining'], values = Object.fromEntries((data?.probabilities || []).map(item => [item.class, item.value]))
  const validation = data?.validation
  const validValidation = validation?.status === 'monitoring' && validation.market_accuracy_verified === false
    && ['current_data_ready', 'evidence_integrity', 'coverage_ok', 'minimum_samples_ok', 'staleness_ok', 'calibration_validated', 'independent_audit_validated', 'provider_validation_completed'].every(key => typeof validation[key] === 'boolean')
  const valid = body?.success === true && data?.status === 'live_preview' && data.mode === 'live' && data.live === true && data.synthetic === false && data.research_only === false
    && data.market_accuracy_verified === false && data.horizon_sessions === horizon && typeof data.as_of === 'string' && Number.isFinite(Date.parse(data.as_of))
    && validValidation && classes.every(name => Number.isFinite(values[name]) && values[name] >= 0 && values[name] <= 1) && Math.abs(classes.reduce((sum, name) => sum + values[name], 0) - 1) < 1e-6 && isForecastBreadthTarget(data.breadth_target)
  if (!valid) return { status: 'unavailable', reason: 'invalid_contract' }
  return { ...data, probabilities: classes.map(name => ({ class: name, value: values[name] })) }
}
