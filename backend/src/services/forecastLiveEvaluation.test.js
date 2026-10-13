const { evaluateLiveForecast } = require('./forecastLiveEvaluation');

describe('live forecast evaluation', () => {
  test('passes for valid current-data source and returns user-readable summary', () => {
    const rows = Array.from({ length: 25 }, (_, index) => ({
      instrument: { symbol: 'FPT' },
      observed_at: new Date(Date.UTC(2026, 9, 12 - (24 - index))).toISOString(),
      quote: { close: String(100 + index) }
    }));

    const result = evaluateLiveForecast({
      currentData: {
        status: 'current_data_ready',
        provider: 'vnstock',
        as_of: '2026-10-12T02:00:00.000Z',
        fetched_at: '2026-10-12T06:00:00.000Z',
        staleness_days: 0.5,
        maximum_staleness_days: 7,
        rows
      },
      horizon: 5,
      modelVersion: 'softmax-v1'
    });

    expect(result).toMatchObject({
      status: 'live_evaluation_ready',
      mode: 'live',
      synthetic: false,
      research_only: false,
      live: true,
      market_accuracy_verified: false,
      decision: 'ready_for_shadow_evaluation'
    });
    expect(result.summary.by_class).toHaveLength(3);
    expect(result.summary.top_class).toBeTruthy();
  });

  test('does not score a shadow prediction before its future outcome exists', () => {
    const rows = Array.from({ length: 30 }, (_, index) => ({
      instrument: { symbol: 'FPT' },
      observed_at: new Date(Date.UTC(2026, 9, 12 - (29 - index))).toISOString(),
      quote: { close: String(100 + index) }
    }));

    const result = evaluateLiveForecast({
      currentData: {
        status: 'current_data_ready',
        provider: 'vnstock',
        as_of: '2026-10-12T02:00:00.000Z',
        fetched_at: '2026-10-12T06:00:00.000Z',
        staleness_days: 0.5,
        maximum_staleness_days: 7,
        rows,
        license: 'personal_research_only',
        coverage: 0.9,
        evidence_integrity: true,
        minimum_samples: 20,
        provider_validated: false,
        audit_validated: false,
        calibration_validated: false
      },
      horizon: 5,
      modelVersion: 'softmax-v1'
    });

    expect(result.shadow_evaluation).toMatchObject({
      status: 'in_progress',
      baseline_comparison: { status: 'unavailable', reason: 'outcomes_not_observed' }
    });
    expect(result.live_activation.ready).toBe(false);
    expect(result.live_activation.requirements).toMatchObject({
      coverage_ok: true,
      calibration_ok: false,
      audit_ok: false,
      provider_valid: true
    });
  });

  test('rejects invalid current-data source before evaluating', () => {
    expect(() => evaluateLiveForecast({ currentData: { status: 'stale' }, horizon: 5 })).toThrow('live_evaluation_unavailable');
  });
});
