'use strict';
const CLASSES = ['declining', 'balanced', 'advancing'];
const BINS = [[0, .5], [.5, .7], [.7, .85], [.85, 1.0000000001]];

function buildForecastHistory({ report, horizon, minimumBinSamples = 5 } = {}) {
  const unavailable = reason => ({ version: 'forecast_history_v1', status: 'unavailable', reason, horizon_sessions: horizon ?? null });
  if (report?.synthetic !== true || report?.research_only !== true) return unavailable('verified_live_history_not_available');
  if (![1, 5].includes(horizon) || !Number.isInteger(minimumBinSamples) || minimumBinSamples < 2) return unavailable('invalid_request');
  const model = report.models?.find(item => item.horizon_sessions === horizon);
  const baseline = report.baselines?.find(item => item.horizon_sessions === horizon);
  if (!model || model.status !== 'evaluated' || model.classes?.join('|') !== CLASSES.join('|')) return unavailable('model_unavailable');
  const samples = new Map(report.samples.map(sample => [sample.as_of, sample]));
  const entries = [];
  for (const [foldIndex, fold] of model.folds.entries()) for (const prediction of fold.predictions || []) {
    const sample = samples.get(prediction.session);
    const outcome = sample?.labels?.find(label => label.horizon_sessions === horizon);
    if (!sample || prediction.probabilities?.length !== 3) continue;
    const probabilities = Object.fromEntries(CLASSES.map((name, index) => [name, prediction.probabilities[index]]));
    if (Object.values(probabilities).some(value => !Number.isFinite(value) || value < 0 || value > 1) || Math.abs(Object.values(probabilities).reduce((a, b) => a + b, 0) - 1) > 1e-9) continue;
    const ranked = CLASSES.map(name => ({ class: name, value: probabilities[name] })).sort((a, b) => b.value - a.value || a.class.localeCompare(b.class));
    const baselineFold = baseline?.folds?.[foldIndex];
    const baselineSnapshot = baselineFold?.status === 'available' ? { version: baseline.version, fit_cutoff: baselineFold.fitCutoff,
      frequency_probabilities: CLASSES.map((name, index) => ({ class: name, value: baselineFold.probabilities[index] })),
      persistence_version: baselineFold.persistence.version,
      persistence_probabilities: CLASSES.map((name, index) => ({ class: name, value: baselineFold.persistence.probabilities[index] })) } : null;
    const base = { fold_index: foldIndex, as_of: prediction.session, horizon_sessions: horizon, model_version: model.version,
      provider: sample.provider, split_hash: model.split_hash, training_hash: fold.training_hash, predicted_class: ranked[0].class, confidence: ranked[0].value,
      probabilities: CLASSES.map(name => ({ class: name, value: probabilities[name] })), baseline_snapshot: baselineSnapshot };
    if (outcome?.status !== 'available' || !CLASSES.includes(outcome.label)) {
      entries.push({ ...base, outcome_status: 'pending', target_session: outcome?.target_session || null, outcome_available_at: null }); continue;
    }
    const truth = CLASSES.indexOf(outcome.label);
    const brier = prediction.probabilities.reduce((sum, value, index) => sum + (value - Number(index === truth)) ** 2, 0);
    entries.push({ ...base, outcome_status: 'measured', target_session: outcome.target_session, outcome_available_at: outcome.label_available_at,
      actual_class: outcome.label, correct: ranked[0].class === outcome.label, brier_multiclass_sum: brier,
      log_loss: -Math.log(Math.max(1e-15, prediction.probabilities[truth])) });
  }
  entries.sort((a, b) => a.as_of.localeCompare(b.as_of));
  if (!entries.length) return unavailable('prediction_history_empty');
  const measured = entries.filter(entry => entry.outcome_status === 'measured');
  const mean = key => measured.length ? measured.reduce((sum, entry) => sum + entry[key], 0) / measured.length : null;
  const baselineFolds = baseline?.folds?.filter(fold => fold.status === 'available') || [];
  const baselineSamples = baselineFolds.reduce((sum, fold) => sum + fold.metrics.samples, 0);
  const weighted = (path) => baselineSamples ? baselineFolds.reduce((sum, fold) => sum + path(fold) * fold.metrics.samples, 0) / baselineSamples : null;
  const modelBrier = mean('brier_multiclass_sum'), modelLogLoss = mean('log_loss');
  const frequencyBrier = weighted(fold => fold.metrics.brier_multiclass_sum), frequencyLogLoss = weighted(fold => fold.metrics.log_loss);
  const persistenceBrier = weighted(fold => fold.persistence.metrics.brier_multiclass_sum), persistenceLogLoss = weighted(fold => fold.persistence.metrics.log_loss);
  const reliability = BINS.map(([lower, upper], index) => {
    const rows = measured.filter(entry => entry.confidence >= lower && entry.confidence < upper);
    return { bin_index: index, confidence_lower: lower, confidence_upper: Math.min(1, upper), samples: rows.length,
      status: rows.length >= minimumBinSamples ? 'observed' : 'insufficient_samples',
      mean_confidence: rows.length ? rows.reduce((sum, row) => sum + row.confidence, 0) / rows.length : null,
      accuracy: rows.length ? rows.filter(row => row.correct).length / rows.length : null };
  });
  return { version: 'forecast_history_v1', status: 'research_history', synthetic: true, research_only: true, live: false,
    market_accuracy_verified: false, calibrated: false, horizon_sessions: horizon, model_version: model.version, split_hash: model.split_hash,
    scoring: { convention: 'lower_is_better_for_brier_and_log_loss', brier_definition: 'sum_over_three_classes', log_loss_floor: 1e-15 },
    summary: { predictions: entries.length, measured: measured.length, pending: entries.length - measured.length,
      brier_multiclass_sum: modelBrier, log_loss: modelLogLoss, accuracy: measured.length ? measured.filter(entry => entry.correct).length / measured.length : null,
      baseline_comparison: { convention: 'model_minus_baseline; negative_favors_model', frequency: { samples: baselineSamples, brier_multiclass_sum: frequencyBrier,
        log_loss: frequencyLogLoss, brier_delta: modelBrier === null || frequencyBrier === null ? null : modelBrier - frequencyBrier,
        log_loss_delta: modelLogLoss === null || frequencyLogLoss === null ? null : modelLogLoss - frequencyLogLoss },
        persistence: { samples: baselineSamples, brier_multiclass_sum: persistenceBrier, log_loss: persistenceLogLoss,
          brier_delta: modelBrier === null || persistenceBrier === null ? null : modelBrier - persistenceBrier,
          log_loss_delta: modelLogLoss === null || persistenceLogLoss === null ? null : modelLogLoss - persistenceLogLoss } } },
    reliability: { minimum_bin_samples: minimumBinSamples, interpretation: 'diagnostic_only_not_calibration', bins: reliability }, entries };
}
module.exports = { buildForecastHistory };
