'use strict';
const CLASSES = ['declining', 'balanced', 'advancing'];
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
function validProbabilities(items) {
  return Array.isArray(items) && items.length === 3 && new Set(items.map(item => item?.class)).size === 3
    && items.every(item => CLASSES.includes(item?.class) && Number.isFinite(item.value) && item.value >= 0 && item.value <= 1)
    && Math.abs(items.reduce((sum, item) => sum + item.value, 0) - 1) <= 1e-6;
}
function validLiveBaseline(baseline, { horizon, asOf, issuedAt, scope } = {}) {
  if (!baseline || baseline.version !== 'forecast_live_baseline_v1' || baseline.horizon_sessions !== horizon
    || !Number.isInteger(baseline.completed_outcomes) || baseline.completed_outcomes < 20
    || !/^[a-f0-9]{64}$/.test(baseline.training_hash || '') || !date(asOf) || !date(baseline.training_from) || !date(baseline.training_to)
    || baseline.training_from >= baseline.training_to || baseline.training_to > asOf
    || !Number.isFinite(Date.parse(baseline.fit_cutoff)) || !Number.isFinite(Date.parse(issuedAt))
    || Date.parse(baseline.fit_cutoff) > Date.parse(issuedAt)
    || Date.parse(baseline.fit_cutoff) < Date.parse(`${baseline.training_to}T15:00:00+07:00`)
    || !validProbabilities(baseline.frequency_probabilities) || !validProbabilities(baseline.persistence_probabilities)) return false;
  if (scope?.contract_version === 'vn_observation_dates_v3') {
    const policy = baseline.input_policy;
    if (!Array.isArray(scope.used_symbols) || !scope.used_symbols.length || scope.used_symbols.some(symbol => typeof symbol !== 'string' || !symbol)
      || new Set(scope.used_symbols).size !== scope.used_symbols.length || scope.as_of_date !== asOf
      || policy?.input_contract_version !== scope.contract_version || policy.as_of_date !== asOf
      || JSON.stringify(policy.symbols) !== JSON.stringify([...scope.used_symbols].sort())
      || policy.availability_policy !== 'fetched_after_close_before_issuance_v1') return false;
  }
  return true;
}
module.exports = { validLiveBaseline, validProbabilities };
