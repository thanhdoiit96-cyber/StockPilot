'use strict';
function buildPositionExitEvaluationReport(rows = []) {
  const summary = { total: 0, pending: 0, evaluated: 0, excluded: 0, unknown: 0, horizons: { '1': 0, '5': 0, '20': 0 } };
  for (const source of rows) {
    const row = source?.toJSON ? source.toJSON() : source; const status = row?.status;
    summary.total += 1; summary[['pending', 'evaluated', 'excluded'].includes(status) ? status : 'unknown'] += 1;
    for (const horizon of ['1', '5', '20']) if (row?.payload?.observations?.[horizon]) summary.horizons[horizon] += 1;
  }
  return { version: 'position_exit_shadow_report_v1', summary, performance_claim_available: false };
}
module.exports = { buildPositionExitEvaluationReport };
