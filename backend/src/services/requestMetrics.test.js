const { createRequestMetrics } = require('./requestMetrics');

test('aggregates request latency, statuses and auth failures without exposing request data', () => {
  const metrics = createRequestMetrics();
  metrics.observe({ statusCode: 200, durationMs: 12, path: '/api/health' });
  metrics.observe({ statusCode: 401, durationMs: 8, path: '/api/auth/me' });
  metrics.observe({ statusCode: 403, durationMs: 5, path: '/api/health' });
  expect(metrics.snapshot()).toMatchObject({ requests: 3, errors: 2, auth_failures: 2, cors_failures: 1, average_latency_ms: 8, statuses: { '200': 1, '401': 1, '403': 1 } });
});
