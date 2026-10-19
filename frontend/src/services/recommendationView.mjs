const toSessionDate = value => {
  if (value instanceof Date) {
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(value)
  }

  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}\s/.test(trimmed)) return trimmed.slice(0, 10)
  return null
}

export function deriveRecommendationView({ result = null, initialData = null, now = new Date() } = {}) {
  const currentSession = toSessionDate(now)
  const initialSession = toSessionDate(initialData?.run?.as_of || initialData?.as_of || initialData?.run?.created_at || initialData?.created_at || initialData?.generated_at)
  const expiredInitialData = Boolean(currentSession && initialSession && initialSession < currentSession)
  const recommendations = Array.isArray(result?.recommendations)
    ? result.recommendations
    : !expiredInitialData && Array.isArray(initialData?.recommendations)
      ? initialData.recommendations
      : []

  return {
    recommendations,
    expiredInitialData,
    generatedAt: result?.generated_at || initialData?.run?.created_at || initialData?.run?.as_of || initialData?.generated_at || null,
  }
}

export function resolveOverviewRecommendations({ latestRecommendations = [], generatedRecommendations = null } = {}) {
  if (Array.isArray(generatedRecommendations)) return generatedRecommendations
  if (Array.isArray(latestRecommendations)) return latestRecommendations
  return []
}
