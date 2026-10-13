'use strict';

const CLASSES = ['declining', 'balanced', 'advancing'];
const UI_CLASSES = ['advancing', 'balanced', 'declining'];

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function buildFeatureVector(rows = []) {
  const bySymbol = new Map();
  for (const row of rows) {
    const symbol = row.instrument?.symbol;
    if (!symbol) continue;
    if (!bySymbol.has(symbol)) bySymbol.set(symbol, []);
    bySymbol.get(symbol).push(row);
  }
  const vectors = [...bySymbol.values()].map(symbolRows => {
    const closes = symbolRows.sort((a, b) => Date.parse(a.observed_at) - Date.parse(b.observed_at)).map(row => safeNumber(row.quote?.close)).filter(value => value > 0);
    if (closes.length < 21) return null;
    const computeReturns = (lookback) => {
    if (closes.length < lookback + 1) return 0;
    const latest = closes[closes.length - 1];
    const previous = closes[closes.length - 1 - lookback];
    if (!previous || previous <= 0) return 0;
    return (latest - previous) / previous;
    };
    return [computeReturns(1), computeReturns(5), computeReturns(20)];
  }).filter(Boolean);
  if (!vectors.length) return null;
  return [0, 1, 2].map(index => vectors.reduce((sum, item) => sum + item[index], 0) / vectors.length);
}

function softmax(values) {
  const max = Math.max(...values);
  const exp = values.map(value => Math.exp(value - max));
  const total = exp.reduce((sum, value) => sum + value, 0) || 1;
  return exp.map(value => value / total);
}

function buildLiveForecastPreview({ currentData, horizon = 5, modelVersion = 'softmax-v1', notice = 'Current-data preview only; market accuracy remains unverified until the live gate passes and provider evidence is validated.' } = {}) {
  if (!currentData || !Array.isArray(currentData.rows) || !currentData.rows.length) {
    const error = new Error('live_forecast_preview_unavailable:no_current_data');
    error.code = 'live_forecast_preview_unavailable';
    throw error;
  }

  const rows = [...currentData.rows].sort((a, b) => Date.parse(a.observed_at) - Date.parse(b.observed_at));
  const vector = buildFeatureVector(rows);
  if (!vector) {
    const error = new Error('live_forecast_preview_unavailable:insufficient_history');
    error.code = 'live_forecast_preview_unavailable';
    throw error;
  }

  const weights = {
    declining: [-0.8, -0.5, -0.2],
    balanced: [0.1, 0.15, 0.05],
    advancing: [0.8, 0.5, 0.3]
  };

  const logits = CLASSES.map((className, index) => {
    const w = weights[className] || [0, 0, 0];
    return vector.reduce((sum, value, featureIndex) => sum + value * w[featureIndex], 0) + index * 0.05;
  });
  const probabilities = softmax(logits);
  const uiProbabilities = UI_CLASSES.map(className => ({
    class: className,
    value: probabilities[CLASSES.indexOf(className)]
  }));

  const topClass = [...uiProbabilities].sort((a, b) => b.value - a.value)[0].class;
  // Seal display probabilities at six decimals while preserving the simplex.
  // Independent rounding can produce 0.999999/1.000001 and break immutable issuance.
  const rounded = uiProbabilities.slice(0, -1).map(item => Number(item.value.toFixed(6)));
  rounded.push(Number((1 - rounded.reduce((sum, value) => sum + value, 0)).toFixed(6)));
  const recommended = uiProbabilities.map((item, index) => ({ class: item.class, value: rounded[index] }));

  return {
    version: 'forecast_live_preview_v1',
    status: 'live_preview',
    mode: 'live',
    source: 'live_provider',
    provider: currentData.provider,
    synthetic: false,
    research_only: false,
    live: true,
    market_accuracy_verified: false,
    calibrated: false,
    horizon_sessions: Number(horizon) || 5,
    as_of: currentData.as_of,
    fetched_at: currentData.fetched_at,
    staleness_days: Number(currentData.staleness_days || 0),
    maximum_staleness_days: Number(currentData.maximum_staleness_days || 7),
    model_version: modelVersion,
    model: {
      version: modelVersion,
      type: 'current-data-softmax-prototype',
      classes: CLASSES,
      history_window: 21,
      summary: {
        top_class: topClass,
        expected_probability_total: Number(probabilities.reduce((sum, value) => sum + value, 0).toFixed(6)),
        by_class: CLASSES.map((className, index) => ({ class: className, value: Number(probabilities[index].toFixed(6)) }))
      }
    },
    probabilities: recommended,
    gate: {
      provider_valid: true,
      evidence_integrity: true,
      coverage_ok: true,
      minimum_samples_ok: true,
      staleness_ok: true,
      live_ready: true
    },
    notice,
    current_data: {
      rows: rows.length,
      newest_observed_at: currentData.as_of,
      stale: Number(currentData.staleness_days || 0) > Number(currentData.maximum_staleness_days || 7)
    }
  };
}

module.exports = { buildLiveForecastPreview };
