'use strict';
const { assertForecastModeGate } = require('./forecastModeGate');
const UI_CLASSES = ['advancing', 'balanced', 'declining'];

// Converts one historical research prediction into an explicit UI-safe contract.
// It never promotes a replay result to a live/current forecast.
function buildForecastPresentation({ report, horizon, asOf } = {}) {
  const unavailable = reason => ({ version: 'forecast_presentation_v1', status: 'unavailable', reason, horizon_sessions: horizon ?? null, as_of: asOf ?? null });
  const localLivePreview = Boolean(report?.local_only) && report?.live === true && !report?.research_only && !report?.synthetic && report?.mode === 'live';
  try {
    assertForecastModeGate({
      mode: report?.mode ?? (report?.live ? 'live' : 'research'),
      provider: report?.provider,
      synthetic: report?.synthetic,
      research_only: report?.research_only,
      live: report?.live,
      local_only: report?.local_only,
      license: report?.license,
      evidence_integrity: report?.evidence_integrity ?? report?.evidenceIntegrity,
      coverage: report?.coverage ?? report?.coverage_ratio,
      sample_count: report?.sample_count ?? report?.sampleCount ?? (Array.isArray(report?.samples) ? report.samples.length : 0),
      minimum_samples: report?.minimum_samples ?? 20
    });
  } catch (error) {
    return unavailable(error.code || 'live_forecast_gate_not_passed');
  }
  if (localLivePreview) {
    if (![1, 5].includes(horizon) || typeof asOf !== 'string') return unavailable('invalid_request');
    const model = report.models?.find(item => item.horizon_sessions === horizon);
    if (!model || model.status !== 'evaluated') return unavailable('model_unavailable');
    const matches = model.folds.flatMap(fold => fold.predictions || []).filter(item => item.session === asOf);
    if (matches.length !== 1) return unavailable(matches.length ? 'ambiguous_prediction' : 'prediction_not_in_replay');
    const byClass = Object.fromEntries(model.classes.map((name, index) => [name, matches[0].probabilities[index]]));
    if (UI_CLASSES.some(name => !Number.isFinite(byClass[name])) || Math.abs(Object.values(byClass).reduce((a, b) => a + b, 0) - 1) > 1e-9) return unavailable('invalid_probabilities');
    return { version: 'forecast_presentation_v1', status: 'local_live_preview', source: 'live_local_preview', synthetic: false, research_only: false,
      live: true, market_accuracy_verified: false, calibrated: model.calibrated === true, model_version: model.version,
      horizon_sessions: horizon, as_of: asOf, probabilities: UI_CLASSES.map(name => ({ class: name, value: byClass[name] })),
      notice: 'Local live preview only; license is pending and the signal is not market-accuracy verified.' };
  }
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
