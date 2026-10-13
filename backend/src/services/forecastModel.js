'use strict';
const { createHash } = require('crypto');
const { evaluateForecastBaseline } = require('./forecastBaseline');
const KEYS = ['return_1', 'return_5', 'return_20'];
const CLASSES = ['declining', 'balanced', 'advancing'];
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function vector(sample) {
  if (!sample.features?.length) return null;
  const rows = [...sample.features].sort((a, b) => String(a.stock_id).localeCompare(String(b.stock_id)));
  if (rows.some(r => KEYS.some(k => !Number.isFinite(r[k])))) return null;
  const result = KEYS.map(k => rows.reduce((sum, r) => sum + r[k] / rows.length, 0));
  return result.every(Number.isFinite) ? result : null;
}
function probabilities(weights, x) {
  const logits = weights.map(w => w.reduce((sum, v, i) => sum + v * x[i], 0));
  const max = Math.max(...logits);
  const exp = logits.map(v => Math.exp(v - max));
  const total = exp.reduce((a, b) => a + b, 0);
  return exp.map(v => v / total);
}

// Fixed optimizer settings; no tuning or calibration against evaluation outcomes.
function evaluateForecastModel({ samples = [], folds = [], horizon = 5 } = {}) {
  if (samples.some(s => s.synthetic !== true)) throw new Error('Prototype requires synthetic samples');
  const baseline = evaluateForecastBaseline({ samples, folds, horizon });
  const bySession = new Map(samples.map(s => [s.as_of, s]));
  const results = baseline.folds.map(fold => {
    if (fold.status !== 'available') return { ...fold };
    const train = fold.train_sessions.map(s => bySession.get(s));
    const test = fold.test_sessions.map(s => bySession.get(s));
    const trainX = train.map(vector), testX = test.map(vector);
    const manifest = { train_sessions: fold.train_sessions, test_sessions: fold.test_sessions, fitCutoff: fold.fitCutoff };
    if ([...trainX, ...testX].some(x => !x)) return { ...manifest, status: 'unavailable', reason: 'invalid_features' };
    const label = s => CLASSES.indexOf(s.labels.find(l => l.horizon_sessions === horizon).label);
    if (new Set(train.map(label)).size < 2) return { ...manifest, status: 'unavailable', reason: 'insufficient_training_classes' };
    const means = KEYS.map((_, j) => trainX.reduce((sum, x) => sum + x[j] / trainX.length, 0));
    const scales = KEYS.map((_, j) => Math.sqrt(trainX.reduce((sum, x) => sum + (x[j] - means[j]) ** 2 / trainX.length, 0)) || 1);
    const normalize = x => [1, ...x.map((v, j) => (v - means[j]) / scales[j])];
    const xs = trainX.map(normalize);
    const weights = CLASSES.map(() => [0, 0, 0, 0]);
    for (let iteration = 0; iteration < 300; iteration++) {
      const gradient = CLASSES.map(() => [0, 0, 0, 0]);
      xs.forEach((x, i) => {
        const ps = probabilities(weights, x);
        gradient.forEach((g, c) => x.forEach((v, j) => { g[j] += (ps[c] - Number(label(train[i]) === c)) * v / xs.length; }));
      });
      weights.forEach((w, c) => w.forEach((v, j) => { w[j] -= 0.05 * (gradient[c][j] + (j ? 0.01 * v : 0)); }));
    }
    const predictions = testX.map((x, i) => ({ session: test[i].as_of, probabilities: probabilities(weights, normalize(x)) }));
    if (predictions.some(p => p.probabilities.some(v => !Number.isFinite(v)))) return { ...manifest, status: 'unavailable', reason: 'numerical_failure' };
    const metrics = { samples: test.length, brier_multiclass_sum: 0, log_loss: 0 };
    predictions.forEach((p, i) => {
      metrics.brier_multiclass_sum += p.probabilities.reduce((sum, v, c) => sum + (v - Number(c === label(test[i]))) ** 2, 0) / test.length;
      metrics.log_loss -= Math.log(Math.max(1e-15, p.probabilities[label(test[i])])) / test.length;
    });
    return { ...manifest, status: 'available', means, scales, weights, predictions, metrics,
      training_hash: hash(train.map((s, i) => [s.as_of, trainX[i], label(s)])),
      comparison: { convention: 'model_minus_baseline; negative favors model',
        frequency_brier_delta: metrics.brier_multiclass_sum - fold.metrics.brier_multiclass_sum,
        persistence_brier_delta: metrics.brier_multiclass_sum - fold.persistence.metrics.brier_multiclass_sum,
        frequency_log_loss_delta: metrics.log_loss - fold.metrics.log_loss,
        persistence_log_loss_delta: metrics.log_loss - fold.persistence.metrics.log_loss } };
  });
  return { version: 'forecast_softmax_prototype_v1', synthetic: true, research_only: true, calibrated: false,
    market_accuracy_verified: false, horizon_sessions: horizon, classes: CLASSES, features: KEYS.map(k => `basket_mean_${k}`),
    optimizer: { iterations: 300, learning_rate: 0.05, l2: 0.01, log_loss_floor: 1e-15 },
    split_hash: baseline.split_hash, excluded: baseline.excluded, folds: results,
    status: results.some(f => f.status === 'available') ? 'evaluated' : 'unavailable' };
}

function summarizeForecastModel(report) {
  if (!report || report.version !== 'forecast_softmax_prototype_v1') {
    throw new Error('Forecast report must be a softmax prototype result');
  }
  const folds = Array.isArray(report.folds) ? report.folds : [];
  const availableFolds = folds.filter(fold => fold.status === 'available');
  const predictions = availableFolds.flatMap(fold => Array.isArray(fold.predictions) ? fold.predictions : []);
  const classNames = Array.isArray(report.classes) ? report.classes : CLASSES;
  const totalProbabilities = predictions.length ? predictions.reduce((sum, item) => sum + item.probabilities.reduce((acc, value) => acc + value, 0), 0) : 0;
  const probabilitySummary = classNames.map((name, index) => {
    const avg = predictions.length ? predictions.reduce((sum, item) => sum + (Number(item.probabilities?.[index]) || 0), 0) / predictions.length : 0;
    return { class: name, average_probability: avg };
  });
  const metrics = availableFolds.map(fold => fold.metrics || { brier_multiclass_sum: 0, log_loss: 0 });
  const metricSummary = metrics.length ? {
    brier_multiclass_sum: metrics.reduce((sum, item) => sum + Number(item.brier_multiclass_sum || 0), 0) / metrics.length,
    log_loss: metrics.reduce((sum, item) => sum + Number(item.log_loss || 0), 0) / metrics.length,
    samples: metrics.reduce((sum, item) => sum + Number(item.samples || 0), 0)
  } : { brier_multiclass_sum: null, log_loss: null, samples: 0 };
  return {
    version: report.version,
    status: report.status,
    research_only: report.research_only,
    synthetic: report.synthetic,
    calibrated: report.calibrated,
    market_accuracy_verified: report.market_accuracy_verified,
    horizon_sessions: report.horizon_sessions,
    classes: classNames,
    available_folds: availableFolds.length,
    total_folds: folds.length,
    metric_summary: metricSummary,
    probability_summary: {
      classes: classNames,
      total_predictions: predictions.length,
      expected_probability_total: totalProbabilities / Math.max(predictions.length, 1),
      by_class: probabilitySummary
    },
    feature_summary: {
      features: Array.isArray(report.features) ? report.features : KEYS.map(k => `basket_mean_${k}`),
      optimizer: report.optimizer || null
    }
  };
}
module.exports = { evaluateForecastModel, summarizeForecastModel };
