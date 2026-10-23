'use strict';
const { buildPositionExitEvaluationReport } = require('./positionExitEvaluationReport');
test('separates v2 horizon cohorts from retained legacy rows', () => {
  const report = buildPositionExitEvaluationReport([
    { status: 'pending', schema_version: 'position_exit_shadow_evaluation_v1' },
    { status: 'evaluated', schema_version: 'position_exit_shadow_evaluation_v2', horizon_days: 1 },
    { status: 'excluded', schema_version: 'position_exit_shadow_evaluation_v2', horizon_days: 5 }
  ]);
  expect(report).toMatchObject({ unit: 'guidance_horizon', legacy_records: 1, horizons: { '1': { evaluated: 1, excluded: 0 }, '5': { evaluated: 0, excluded: 1 } }, performance_claim_available: false, pending_count_available: false });
});
test('reports cohort coverage without inferring model performance', () => {
  expect(buildPositionExitEvaluationReport([{ status: 'pending', payload: { observations: { '1': {}, '5': null, '20': null } } }, { status: 'evaluated', payload: { observations: { '1': {}, '5': {}, '20': {} } } }, { status: 'excluded', payload: {} }])).toEqual({ version: 'position_exit_shadow_report_v1', summary: { total: 3, pending: 1, evaluated: 1, excluded: 1, unknown: 0, horizons: { '1': 2, '5': 1, '20': 1 } }, performance_claim_available: false });
});
