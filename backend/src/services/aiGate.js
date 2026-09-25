'use strict';

function evaluateGenerativeAiGate({ qualityReports = [], backtestReport = null, rightsVerified = false, providerReady = false } = {}) {
  const reasons = [];
  if (!qualityReports.length || qualityReports.some(report => report.status !== 'pass' || Number(report.score) < 90)) reasons.push('quality_gate_not_passed_for_all_symbols');
  if (!backtestReport || !Array.isArray(backtestReport.results) || !backtestReport.results.length) reasons.push('backtest_evidence_missing');
  if (!rightsVerified) reasons.push('provider_display_rights_not_verified');
  if (!providerReady) reasons.push('generative_provider_not_configured');
  return { enabled: reasons.length === 0, reasons, policy: 'generative_ai_gate_v1', evaluated_at: new Date().toISOString() };
}

module.exports = { evaluateGenerativeAiGate };
