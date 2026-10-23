'use strict';
function buildPositionExitEvaluationReport(rows = []) {
  const plain = rows.map(row => row?.toJSON ? row.toJSON() : row);
  if (plain.some(row => row.schema_version === 'position_exit_shadow_evaluation_v2')) {
    const current = plain.filter(row => row.schema_version === 'position_exit_shadow_evaluation_v2');
    return { version: 'position_exit_shadow_report_v2', unit: 'guidance_horizon', legacy_records: plain.length - current.length,
      horizons: Object.fromEntries([1, 5, 20].map(horizon => {
        const cohort = current.filter(row => row.horizon_days === horizon);
        return [String(horizon), { evaluated: cohort.filter(row => row.status === 'evaluated').length, excluded: cohort.filter(row => row.status === 'excluded').length }];
      })), pending_count_available: false, performance_claim_available: false };
  }
  const summary = { total: 0, pending: 0, evaluated: 0, excluded: 0, unknown: 0, horizons: { '1': 0, '5': 0, '20': 0 } };
  for (const source of rows) {
    const row = source?.toJSON ? source.toJSON() : source; const status = row?.status;
    summary.total += 1; summary[['pending', 'evaluated', 'excluded'].includes(status) ? status : 'unknown'] += 1;
    for (const horizon of ['1', '5', '20']) if (row?.payload?.observations?.[horizon]) summary.horizons[horizon] += 1;
  }
  return { version: 'position_exit_shadow_report_v1', summary, performance_claim_available: false };
}
module.exports = { buildPositionExitEvaluationReport };
