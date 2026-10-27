import { isForecastBreadthTarget } from './forecastBreadth.mjs'

const currentPreviewCache = new Map()
const CURRENT_PREVIEW_CACHE_TTL_MS = 60_000

export async function fetchOfficialVn30Preview(horizon, { signal } = {}) {
  if (![1, 5].includes(horizon)) throw new Error('invalid_horizon')
  if (!isCurrentPreviewEnabled()) return { status: 'unavailable', reason: 'preview_disabled' }
  const response = await fetch(`/api/forecast/official-vn30-preview?horizon=${horizon}`, { signal, credentials: 'same-origin', headers: { Accept: 'application/json' } })
  if (!response.ok) return { status: 'unavailable', reason: response.status === 404 ? 'preview_disabled' : 'request_failed' }
  const body = await response.json(), data = body?.data
  const invalid = { status: 'unavailable', reason: 'invalid_contract' }
  if (!body.success || data?.version !== 'official_vn30_preview_v1' || data.universe !== 'OfficialVN30' || data.horizon_sessions !== horizon || data.research_only !== true || data.synthetic !== false || data.live !== false || data.publication_permitted !== false || data.market_accuracy_verified !== false || data.mode !== 'internal_research') return invalid
  if (data.status === 'unavailable') return { ...data, probabilities: undefined }
  const classes = ['advancing', 'balanced', 'declining']
  const values = Object.fromEntries((data.probabilities || []).map(item => [item.class, item.value]))
  if (data.status !== 'official_vn30_preview' || data.coverage?.universe !== 30 || ![29, 30].includes(data.coverage?.observed) || data.coverage?.history_sessions !== 60 || !/^[a-f0-9]{64}$/.test(data.membership?.membership_sha256 || '') || !/^[a-f0-9]{64}$/.test(data.input_sha256 || '') || !isForecastBreadthTarget(data.breadth_target) || !Number.isFinite(Date.parse(data.as_of)) || classes.some(name => !Number.isFinite(values[name]) || values[name] < 0 || values[name] > 1) || Math.abs(classes.reduce((sum, name) => sum + values[name], 0) - 1) > 1e-6) return invalid
  return { ...data, probabilities: classes.map(name => ({ class: name, value: values[name] })) }
}

function currentPreviewCacheKey(symbols, horizon) {
  return `${horizon}:${Array.from(new Set(symbols)).map(value => String(value).trim().toUpperCase()).filter(Boolean).sort().join(',') || 'FPT,HPG,VHM'}`
}

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

export async function fetchForecastCurrentPreview(symbols = ['FPT', 'HPG', 'VHM'], { signal, horizon = 5, forceReload = false } = {}) {
  if (!isCurrentPreviewEnabled()) return { status: 'unavailable', reason: 'preview_disabled' }
  if (![1, 5].includes(horizon)) throw new Error('invalid_horizon')
  const normalizedSymbols = Array.from(new Set(symbols)).map(value => String(value).trim().toUpperCase()).filter(Boolean).sort()
  const cacheKey = currentPreviewCacheKey(normalizedSymbols, horizon)
  const cached = currentPreviewCache.get(cacheKey)
  if (!forceReload && cached && cached.expiresAt > Date.now()) return { ...cached.data, cache_status: 'memory', cache_expires_at: new Date(cached.expiresAt).toISOString() }
  const query = new URLSearchParams({ symbols: normalizedSymbols.join(',') || 'FPT,HPG,VHM', horizon: String(horizon) })
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
  const normalized = { ...data, probabilities: classes.map(name => ({ class: name, value: values[name] })), cache_status: 'network' }
  currentPreviewCache.set(cacheKey, { data: normalized, expiresAt: Date.now() + CURRENT_PREVIEW_CACHE_TTL_MS })
  return normalized
}
