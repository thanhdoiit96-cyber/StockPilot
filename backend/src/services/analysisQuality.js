'use strict';

function evaluateInsightQuality({ analysis, externalFactors = [] }) {
  const checks = {
    price_history: analysis?.observations >= 50 ? 'pass' : analysis?.observations >= 20 ? 'limited' : 'fail',
    provenance: externalFactors.length === 0 || externalFactors.every(item => item.source && item.published_at && item.fetched_at) ? 'pass' : 'fail',
    explanation: analysis?.insight?.factors?.length ? 'pass' : 'fail',
    disclaimer: analysis?.disclaimer && analysis?.insight?.disclaimer ? 'pass' : 'fail'
  };
  const values = Object.values(checks);
  const status = values.includes('fail') ? 'blocked' : values.includes('limited') ? 'limited' : 'pass';
  return { status, checks, score: Math.round((values.filter(value => value === 'pass').length / values.length) * 100), evaluated_at: new Date().toISOString(), policy: 'quality_gate_v1' };
}

module.exports = { evaluateInsightQuality };
