'use strict';
const UI_CLASSES = ['advancing', 'balanced', 'declining'];

// Converts one historical research prediction into an explicit UI-safe contract.
// It never promotes a replay result to a live/current forecast.
function buildForecastPresentation({ report, horizon, asOf } = {}) {
  const unavailable = reason => ({ version: 'forecast_presentation_v1', status: 'unavailable', reason, horizon_sessions: horizon ?? null, as_of: asOf ?? null });
  if (!report || report.synthetic !== true || report.research_only !== true) return unavailable('verified_live_forecast_not_available');
  if (![1, 5].includes(horizon) || typeof asOf !== 'string') return unavailable('invalid_request');
  const model = report.models?.find(item => item.horizon_sessions === horizon);
  if (!model || model.status !== 'evaluated') return unavailable('model_unavailable');
  const matches = model.folds.flatMap(fold => fold.predictions || []).filter(item => item.session === asOf);
  if (matches.length !== 1) return unavailable(matches.length ? 'ambiguous_prediction' : 'prediction_not_in_replay');
  const byClass = Object.fromEntries(model.classes.map((name, index) => [name, matches[0].probabilities[index]]));
  if (UI_CLASSES.some(name => !Number.isFinite(byClass[name])) || Math.abs(Object.values(byClass).reduce((a, b) => a + b, 0) - 1) > 1e-9) return unavailable('invalid_probabilities');
  return { version: 'forecast_presentation_v1', status: 'research_preview', source: 'synthetic_replay', synthetic: true, research_only: true,
    live: false, market_accuracy_verified: false, calibrated: model.calibrated === true, model_version: model.version,
    horizon_sessions: horizon, as_of: asOf, probabilities: UI_CLASSES.map(name => ({ class: name, value: byClass[name] })),
    notice: 'Synthetic replay only; not a current market forecast.' };
}
module.exports = { buildForecastPresentation };
