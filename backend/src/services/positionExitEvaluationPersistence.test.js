'use strict';
const { sealPositionExitEvaluation } = require('./positionExitEvaluationPersistence');
const evaluation = { version: 'position_exit_shadow_evaluation_v1', status: 'pending', coverage: { observed_subsequent_sessions: 1 } };
test('seals one immutable model-specific evaluation per frozen guidance', async () => {
  const PositionExitEvaluation = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'evaluation-1' }) };
  await expect(sealPositionExitEvaluation({ PositionExitEvaluation, guidanceId: 'guidance-1', evaluation, now: new Date('2026-10-23') })).resolves.toMatchObject({ status: 'created', evaluation_id: 'evaluation-1', payload_sha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
  expect(PositionExitEvaluation.create).toHaveBeenCalledWith(expect.objectContaining({ schema_version: evaluation.version, status: 'pending' }), { transaction: undefined });
});
test('does not replace an immutable evaluation', async () => {
  const PositionExitEvaluation = { findOne: jest.fn().mockResolvedValue({ id: 'existing' }), create: jest.fn() };
  await expect(sealPositionExitEvaluation({ PositionExitEvaluation, guidanceId: 'guidance-1', evaluation })).resolves.toEqual({ status: 'evaluation_exists', evaluation_id: 'existing' });
  expect(PositionExitEvaluation.create).not.toHaveBeenCalled();
});

test('v2 does not persist pending and seals each horizon independently with concurrent-safe creation', async () => {
  const PositionExitEvaluation = { findOne: jest.fn().mockResolvedValue(null), findOrCreate: jest.fn().mockResolvedValue([{ id: 'h1' }, true]) };
  const value = { version: 'position_exit_shadow_evaluation_v2', horizon_days: 1, status: 'pending' };
  expect(await sealPositionExitEvaluation({ PositionExitEvaluation, guidanceId: 'g', evaluation: value })).toEqual({ status: 'pending' });
  expect(PositionExitEvaluation.findOne).not.toHaveBeenCalled();
  await sealPositionExitEvaluation({ PositionExitEvaluation, guidanceId: 'g', evaluation: { ...value, status: 'evaluated' } });
  expect(PositionExitEvaluation.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({ where: { guidance_id: 'g', horizon_days: 1, schema_version: value.version } }));
});
