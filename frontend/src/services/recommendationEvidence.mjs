const finite = value => value !== null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null

export function recommendationEvidence(item, criteria = []) {
  const rationale = item?.rationale || {}
  const plan = rationale.reference_plan || {}
  const indicators = rationale.indicators || {}
  const parts = rationale.score_parts || {}
  const weights = rationale.weights || {}
  const calibration = rationale.calibration || {}
  const observations = finite(rationale.observations ?? rationale.evidence?.objective?.observations)
  const sources = Array.isArray(rationale.evidence?.sources) ? rationale.evidence.sources.map(source => {
    try {
      const url = new URL(source?.source_url)
      if (!['http:', 'https:'].includes(url.protocol) || !source?.source || !source?.published_at || !Number.isFinite(Date.parse(source.published_at))) return null
      return { type: source.type || 'external', source: String(source.source), title: String(source.title || source.source), url: url.href, publishedAt: source.published_at }
    } catch { return null }
  }).filter(Boolean).slice(0, 10) : []
  return {
    model: rationale.model || null,
    priceSource: plan.price_source === 'intraday' ? 'Intraday' : plan.price_source === 'eod' ? 'EOD' : null,
    observedAt: plan.observed_at || null,
    observations,
    trend: rationale.trend || null,
    rsi14: finite(indicators.rsi14),
    momentum10: finite(indicators.momentum10),
    volatilityPct: finite(rationale.volatility_pct),
    averageVolume: finite(rationale.average_volume), sources,
    factors: criteria.map(criterion => ({
      key: criterion.key,
      label: criterion.label,
      score: finite(parts[criterion.key]),
      weight: finite(weights[criterion.key]),
      calibration: finite(calibration[criterion.key])
    })).filter(factor => factor.score !== null)
  }
}
