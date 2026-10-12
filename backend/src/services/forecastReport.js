'use strict';
function summarizeForecastReport(report) {
  const countReasons = items => items.reduce((counts, reason) => { counts[reason] = (counts[reason] || 0) + 1; return counts; }, {});
  return {
    scope: report.synthetic ? 'synthetic_research' : 'supplied_evidence_research',
    market_accuracy_verified: false,
    sample_count: report.samples.length,
    excluded_origin_count: report.excluded.length,
    origin_exclusion_reasons: countReasons(report.excluded.flatMap(item => item.reasons)),
    horizons: report.baselines.map(baseline => ({
      horizon_sessions: baseline.horizon_sessions,
      status: baseline.status,
      evaluated_folds: baseline.folds.filter(fold => fold.status === 'available').length,
      unavailable_folds: baseline.folds.filter(fold => fold.status !== 'available').length,
      scored_samples: baseline.folds.reduce((sum, fold) => sum + (fold.metrics?.samples || 0), 0),
      excluded_labels: baseline.excluded.length,
      exclusion_reasons: countReasons(baseline.excluded.map(item => item.reason)),
      invalidated_outcomes: report.outcome_audits.filter(a => a.horizon_sessions === baseline.horizon_sessions && a.status === 'invalidated').length
    }))
  };
}
module.exports = { summarizeForecastReport };
