'use strict';
const { createHash } = require('crypto');
const CLASSES = ['declining', 'balanced', 'advancing'];
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const timestamp = value => typeof value === 'string' && /T.*(Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
function scoreProbabilities(probabilities, test) {
  let brier = 0, logLoss = 0;
  for (const row of test) {
    const truth = CLASSES.indexOf(row.label);
    brier += probabilities.reduce((sum, p, i) => sum + (p - Number(i === truth)) ** 2, 0);
    logLoss -= Math.log(probabilities[truth]);
  }
  return { samples: test.length, brier_multiclass_sum: brier / test.length, log_loss: logLoss / test.length };
}

// Each fold is specified before evaluation. All samples at a date share a fold.
// Purging uses the actual target session, never a guessed calendar-day gap.
function evaluateForecastBaseline({ samples = [], folds = [], horizon = 5 } = {}) {
  if (![1, 5].includes(horizon)) throw new Error('Unsupported forecast horizon');
  const contexts = new Set(samples.map(s => JSON.stringify([s.target_version, s.provider, s.synthetic, s.calendar_version, s.calendar_source])));
  if (contexts.size > 1) throw new Error('Mixed forecast dataset contexts');
  const seen = new Set();
  const rows = [], excluded = [];
  for (const sample of samples) {
    if (!validDate(sample.as_of) || seen.has(sample.as_of)) throw new Error('Invalid or duplicate sample session');
    seen.add(sample.as_of);
    if (sample.target_version !== 'breadth_forward_v1' || typeof sample.synthetic !== 'boolean' || !sample.provider || !sample.calendar_version || !sample.calendar_source) throw new Error('Missing dataset provenance');
    const label = sample.labels?.find(l => l.horizon_sessions === horizon);
    if (sample.status !== 'features_available' || label?.status !== 'available') {
      excluded.push({ session: sample.as_of, reason: label?.reason || sample.reasons?.[0] || 'sample_unavailable' }); continue;
    }
    if (!validDate(label.target_session) || label.target_session <= sample.as_of || !CLASSES.includes(label.label)) throw new Error('Invalid forecast outcome');
    const availableAt = timestamp(label.label_available_at);
    if (!Number.isFinite(availableAt) || availableAt < Date.parse(label.target_session + 'T15:00:00+07:00')) {
      excluded.push({ session: sample.as_of, reason: 'label_availability_invalid' }); continue;
    }
    rows.push({ session: sample.as_of, target: label.target_session, label: label.label, label_available_at: new Date(availableAt).toISOString() });
  }
  rows.sort((a, b) => a.session.localeCompare(b.session));
  let previousEnd = null;
  const results = folds.map(({ testStart, testEnd, trainStart, fitCutoff }) => {
    if (!validDate(testStart) || !validDate(testEnd) || testEnd < testStart || (trainStart && (!validDate(trainStart) || trainStart >= testStart)) || (previousEnd && testStart <= previousEnd)) throw new Error('Invalid or overlapping folds');
    previousEnd = testEnd;
    if (!Number.isFinite(timestamp(fitCutoff)) || timestamp(fitCutoff) >= Date.parse(testStart + 'T00:00:00+07:00')) throw new Error('Fit cutoff must precede the test session');
    const candidates = rows.filter(r => r.session < testStart && (!trainStart || r.session >= trainStart));
    const train = candidates.filter(r => r.target < testStart && timestamp(r.label_available_at) <= timestamp(fitCutoff));
    const test = rows.filter(r => r.session >= testStart && r.session <= testEnd);
    const manifest = { testStart, testEnd, fitCutoff, trainStart: trainStart || null,
      late_label_sessions: candidates.filter(r => r.target < testStart && timestamp(r.label_available_at) > timestamp(fitCutoff)).map(r => r.session),
      train_sessions: train.map(r => r.session), test_sessions: test.map(r => r.session),
      purged_sessions: candidates.filter(r => r.target >= testStart).map(r => r.session) };
    if (!train.length || !test.length) return { ...manifest, status: 'unavailable', reason: !train.length ? 'empty_train' : 'empty_test' };
    // Fixed Laplace smoothing avoids zero-probability log loss; alpha is not tuned on test.
    const counts = CLASSES.map(c => train.filter(r => r.label === c).length);
    const probabilities = counts.map(count => (count + 1) / (train.length + CLASSES.length));
    // Same frozen information set as frequency: no updating from test outcomes.
    const latest = [...train].sort((a, b) => a.target.localeCompare(b.target) || a.session.localeCompare(b.session)).at(-1);
    const persistenceProbabilities = CLASSES.map(c => c === latest.label ? 0.8 : 0.1);
    const metrics = scoreProbabilities(probabilities, test);
    const persistenceMetrics = scoreProbabilities(persistenceProbabilities, test);
    return { ...manifest, status: 'available', counts, probabilities,
      metrics,
      persistence: { version: 'forecast_persistence_baseline_v1', mode: 'frozen_at_fit',
        source_session: latest.session, source_target_session: latest.target, source_label_available_at: latest.label_available_at,
        probabilities: persistenceProbabilities, metrics: persistenceMetrics },
      comparison: { convention: 'frequency_minus_persistence; negative favors frequency',
        brier_delta: metrics.brier_multiclass_sum - persistenceMetrics.brier_multiclass_sum,
        log_loss_delta: metrics.log_loss - persistenceMetrics.log_loss } };
  });
  return { version: 'forecast_frequency_baseline_v1', horizon_sessions: horizon, classes: CLASSES,
    synthetic: samples[0]?.synthetic ?? null, dataset_context: samples.length ? JSON.parse([...contexts][0]) : null,
    dataset_hash: digest(rows), split_hash: digest(folds), smoothing_alpha: 1,
    excluded, folds: results, status: results.some(r => r.status === 'available') ? 'evaluated' : 'unavailable' };
}
module.exports = { evaluateForecastBaseline };
