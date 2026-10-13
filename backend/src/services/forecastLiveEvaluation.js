'use strict';

const CLASSES = ['declining', 'balanced', 'advancing'];

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getReturn(rows, lookback) {
  const sorted = [...rows].sort((a, b) => Date.parse(a.observed_at) - Date.parse(b.observed_at));
  if (sorted.length <= lookback) return 0;
  const latest = safeNumber(sorted[sorted.length - 1].quote?.close);
  const previous = safeNumber(sorted[sorted.length - 1 - lookback].quote?.close);
  if (previous <= 0) return 0;
  return (latest - previous) / previous;
}

function softmax(values) {
  const max = Math.max(...values);
  const exp = values.map(value => Math.exp(value - max));
  const total = exp.reduce((sum, value) => sum + value, 0) || 1;
  return exp.map(value => value / total);
}

function evaluateLiveForecast({ currentData, horizon = 5, modelVersion = 'softmax-v1' } = {}) {
  if (!currentData || currentData.status !== 'current_data_ready') {
    const error = new Error('live_evaluation_unavailable:current_data_not_ready');
    error.code = 'live_evaluation_unavailable';
    throw error;
  }

  const rows = [...currentData.rows].sort((a, b) => Date.parse(a.observed_at) - Date.parse(b.observed_at));
  if (rows.length < 20) {
    const error = new Error('live_evaluation_unavailable:insufficient_history');
    error.code = 'live_evaluation_unavailable';
    throw error;
  }

  const featureVector = [getReturn(rows, 1), getReturn(rows, 5), getReturn(rows, 20)];
  const weights = {
    declining: [-0.9, -0.5, -0.25],
    balanced: [0.15, 0.15, 0.05],
    advancing: [0.95, 0.7, 0.35]
  };

  const logits = CLASSES.map(className => {
    const vector = weights[className] || [0, 0, 0];
    return featureVector.reduce((sum, value, index) => sum + value * vector[index], 0);
  });

  const probabilities = softmax(logits);
  const byClass = CLASSES.map((className, index) => ({ class: className, value: Number(probabilities[index].toFixed(6)) }));
  const topClass = [...byClass].sort((a, b) => b.value - a.value)[0].class;

  const coverageRatio = Math.min(1, rows.length / 20);
  const providerValid = Boolean(currentData.provider && currentData.provider !== 'fixture');
  const evidenceIntegrity = currentData.evidence_integrity !== false && currentData.evidenceIntegrity !== false;
  const calibrationValidated = Boolean(currentData.calibration_validated || currentData.calibrationValidated || false);
  const auditValidated = Boolean(currentData.audit_validated || currentData.auditValidated || false);
  const providerValidated = Boolean(currentData.provider_validated || currentData.providerValidated || false);

  const gate = {
    provider_valid: providerValid,
    evidence_integrity: evidenceIntegrity,
    coverage_ok: coverageRatio >= 0.8,
    minimum_samples_ok: rows.length >= 20,
    staleness_ok: Number(currentData.staleness_days || 0) <= Number(currentData.maximum_staleness_days || 7),
    calibration_ok: calibrationValidated,
    audit_ok: auditValidated,
    provider_validation_ok: providerValidated,
    live_ready: false
  };

  gate.live_ready = gate.provider_valid && gate.evidence_integrity && gate.coverage_ok && gate.minimum_samples_ok && gate.staleness_ok && gate.calibration_ok && gate.audit_ok && gate.provider_validation_ok;

  const liveActivation = {
    ready: gate.live_ready,
    requirements: {
      coverage_ok: gate.coverage_ok,
      calibration_ok: gate.calibration_ok,
      audit_ok: gate.audit_ok,
      provider_valid: gate.provider_valid,
      provider_validation_ok: gate.provider_validation_ok,
      evidence_integrity: gate.evidence_integrity,
      staleness_ok: gate.staleness_ok
    },
    status: gate.live_ready ? 'ready' : 'blocked',
    reason: gate.live_ready ? 'all_requirements_met' : 'coverage_calibration_audit_provider_validation_required'
  };

  const decision = gate.provider_valid && gate.evidence_integrity && gate.coverage_ok && gate.minimum_samples_ok && gate.staleness_ok
    ? 'ready_for_shadow_evaluation'
    : 'blocked_by_current_data_gate';

  const shadowEvaluation = {
    status: gate.live_ready ? 'complete' : 'in_progress',
    samples: rows.length,
    coverage_ratio: Number(coverageRatio.toFixed(6)),
    model_probabilities: probabilities.map(value => Number(value.toFixed(6))),
    baseline_comparison: {
      status: 'unavailable',
      reason: 'outcomes_not_observed',
      convention: 'scores_require_future_outcomes_from_the_same_issued_snapshot'
    },
    calibration_status: calibrationValidated ? 'validated' : 'pending',
    audit_status: auditValidated ? 'validated' : 'pending',
    provider_validation_status: providerValidated ? 'validated' : 'pending'
  };

  return {
    version: 'forecast_live_evaluation_v1',
    status: 'live_evaluation_ready',
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
    decision,
    shadow_evaluation: shadowEvaluation,
    live_activation: liveActivation,
    summary: {
      top_class: topClass,
      expected_probability_total: Number(probabilities.reduce((sum, value) => sum + value, 0).toFixed(6)),
      by_class: byClass,
      feature_vector: featureVector.map(value => Number(value.toFixed(6))),
      observations: rows.length
    },
    gate,
    notice: 'Shadow issuance is ready for observation. Brier/log-loss remain unavailable until future outcomes are linked to the same immutable issued snapshot.'
  };
}

module.exports = { evaluateLiveForecast };
