const finite = value => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value)

export function recommendationSignal(item = {}, criteria = []) {
  const parts = item.rationale?.score_parts || {}
  const factors = criteria.map(criterion => ({ key: criterion.key, label: criterion.label, score: finite(parts[criterion.key]) }))
    .filter(factor => factor.score != null && factor.score >= 0 && factor.score <= 100)
    .sort((a, b) => b.score - a.score)
  const horizon = finite(item.horizon_days)
  const observed = finite(item.observed_session_count)
  const value = finite(item.forward_return_pct)
  const state = item.measurement_status === 'excluded' ? 'excluded'
    : item.statistics_eligible === true && item.measurement_status === 'eligible' && value != null ? 'eligible'
      : item.measurement_status === 'pending' ? 'pending' : 'untracked'
  return { state, horizon: Number.isInteger(horizon) && horizon > 0 ? horizon : null,
    observed: Number.isInteger(observed) && observed >= 0 ? observed : null,
    returnPct: state === 'eligible' ? value : null,
    supporting: factors.slice(0, 2), review: factors.length > 2 && factors.at(-1).score < factors[0].score ? factors.at(-1) : null }
}
