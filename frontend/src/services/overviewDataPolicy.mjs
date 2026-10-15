export function isEodReady(dataQuality = {}) {
  if (!dataQuality || typeof dataQuality !== 'object') return false

  const covered = Number(dataQuality.covered ?? 0)
  const listed = Number(dataQuality.listed ?? 0)
  const missing = Number(dataQuality.missing ?? 0)

  if (!Number.isFinite(covered) || !Number.isFinite(listed) || !Number.isFinite(missing)) return false
  if (listed <= 0 && covered <= 0) return false
  return Boolean(dataQuality.ready) && covered >= listed && missing === 0
}

export function hasLastVerifiedEodData(dataQuality = {}) {
  if (!dataQuality || typeof dataQuality !== 'object') return false

  const covered = Number(dataQuality.covered ?? 0)
  const listed = Number(dataQuality.listed ?? 0)
  const missing = Number(dataQuality.missing ?? 0)

  if (!Number.isFinite(covered) || !Number.isFinite(listed) || !Number.isFinite(missing)) return false
  if (listed <= 0 && covered <= 0) return false
  return covered > 0 || listed > 0
}

export function shouldDeferOverviewData(dataQuality = {}) {
  if (!dataQuality || typeof dataQuality !== 'object') return true
  if (isEodReady(dataQuality)) return false
  if (hasLastVerifiedEodData(dataQuality)) return false

  const runtime = dataQuality.eod_retry?.runtime || {}
  return Boolean(dataQuality.ready) === false || !dataQuality.session_date || Number(dataQuality.missing || 0) > 0 || Boolean(runtime.running)
}
