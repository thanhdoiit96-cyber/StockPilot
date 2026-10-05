'use strict';

function createRequestMetrics() {
  const startedAt = Date.now();
  const totals = { requests: 0, errors: 0, authFailures: 0, corsFailures: 0, latencyMs: 0 };
  const statuses = Object.create(null);

  return {
    observe({ statusCode = 0, durationMs = 0, path = '' } = {}) {
      totals.requests += 1;
      totals.latencyMs += Math.max(0, Number(durationMs) || 0);
      const status = String(statusCode || 0);
      statuses[status] = (statuses[status] || 0) + 1;
      if (statusCode >= 400) totals.errors += 1;
      if (statusCode === 401 || statusCode === 403) totals.authFailures += 1;
      if (statusCode === 403 && path === '/api/health') totals.corsFailures += 1;
    },
    snapshot() {
      return {
        uptime_ms: Date.now() - startedAt,
        requests: totals.requests,
        errors: totals.errors,
        auth_failures: totals.authFailures,
        cors_failures: totals.corsFailures,
        average_latency_ms: totals.requests ? Math.round(totals.latencyMs / totals.requests) : 0,
        statuses: { ...statuses }
      };
    }
  };
}

module.exports = { createRequestMetrics };
