'use strict';
const { buildPositionExitEvaluationReport } = require('./positionExitEvaluationReport');
test('reports cohort coverage without inferring model performance', () => {
  expect(buildPositionExitEvaluationReport([{ status: 'pending', payload: { observations: { '1': {}, '5': null, '20': null } } }, { status: 'evaluated', payload: { observations: { '1': {}, '5': {}, '20': {} } } }, { status: 'excluded', payload: {} }])).toEqual({ version: 'position_exit_shadow_report_v1', summary: { total: 3, pending: 1, evaluated: 1, excluded: 1, unknown: 0, horizons: { '1': 2, '5': 1, '20': 1 } }, performance_claim_available: false });
});
