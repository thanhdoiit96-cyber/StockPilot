const { evaluateGenerativeAiGate } = require('./aiGate');

test('keeps generative AI disabled until all gates pass', () => {
  const result = evaluateGenerativeAiGate({ qualityReports: [{ status: 'pass', score: 100 }], backtestReport: { results: [{}] }, rightsVerified: false });
  expect(result.enabled).toBe(false);
  expect(result.reasons).toContain('provider_display_rights_not_verified');
});

test('enables only when quality, evidence, rights and a provider are present', () => {
  expect(evaluateGenerativeAiGate({ qualityReports: [{ status: 'pass', score: 100 }], backtestReport: { results: [{}] }, rightsVerified: true, providerReady: true }).enabled).toBe(true);
});
