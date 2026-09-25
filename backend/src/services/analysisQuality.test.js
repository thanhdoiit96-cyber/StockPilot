const { evaluateInsightQuality } = require('./analysisQuality');

test('blocks insight with insufficient evidence and passes provenance checks', () => {
  const result = evaluateInsightQuality({ analysis: { observations: 6, disclaimer: 'x', insight: { factors: ['x'], disclaimer: 'y' } }, externalFactors: [] });
  expect(result.status).toBe('blocked');
  expect(result.checks.price_history).toBe('fail');
  expect(result.policy).toBe('quality_gate_v1');
});

