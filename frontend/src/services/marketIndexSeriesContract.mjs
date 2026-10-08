const DATE = /^\d{4}-\d{2}-\d{2}$/
const SYMBOL = /^[A-Z0-9_-]{2,24}$/
const RETURN_TYPES = new Set(['price_return', 'total_return'])
const finitePositive = value => Number.isFinite(Number(value)) && Number(value) > 0
const validUrl = value => {
  try { return ['https:'].includes(new URL(value).protocol) } catch { return false }
}
const validTimestamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value))

function strictAscending(values, key) {
  let previous = null
  return values.every(value => {
    const current = key(value)
    if (previous !== null && current <= previous) return false
    previous = current
    return true
  })
}

/**
 * Validates the minimum provenance and continuity contract before an external
 * index series can leave the development-only fixture gate. It does not fetch
 * data, infer missing points, or grant a provider display rights.
 */
export function validateMarketIndexSeries(series) {
  const reasons = []
  if (!series || typeof series !== 'object') return { valid: false, reasons: ['invalid_payload'] }
  if (!SYMBOL.test(String(series.symbol || '').toUpperCase())) reasons.push('invalid_symbol')
  if (!series.provider || series.provider === 'fixture') reasons.push('unapproved_provider')
  if (!series.license || typeof series.license !== 'string') reasons.push('missing_license')
  if (!validUrl(series.source_url)) reasons.push('invalid_source_url')
  if (series.session_timezone !== 'Asia/Ho_Chi_Minh') reasons.push('invalid_session_timezone')
  if (!RETURN_TYPES.has(series.return_type)) reasons.push('invalid_return_type')
  if (!validTimestamp(series.observed_at)) reasons.push('invalid_observed_at')
  if (!Number.isInteger(series.stale_after_seconds) || series.stale_after_seconds < 1) reasons.push('invalid_stale_window')
  if (!series.previous_close || !DATE.test(series.previous_close.session_date || '') || !finitePositive(series.previous_close.close)) reasons.push('invalid_previous_close')

  const points = Array.isArray(series.points) ? series.points : []
  if (points.length < 2 || !points.every(point => DATE.test(point?.session_date || '') && finitePositive(point.close)) || !strictAscending(points, point => point.session_date)) reasons.push('invalid_daily_points')

  if (series.intraday_points !== undefined) {
    const points = Array.isArray(series.intraday_points) ? series.intraday_points : []
    const day = typeof series.observed_at === 'string' ? series.observed_at.slice(0, 10) : ''
    const validIntraday = points.length > 1
      && points.every(point => validTimestamp(point?.observed_at) && point.observed_at.startsWith(day) && finitePositive(point.close))
      && strictAscending(points, point => Date.parse(point.observed_at))
    if (!validIntraday) reasons.push('invalid_intraday_points')
  }
  return { valid: reasons.length === 0, reasons }
}
