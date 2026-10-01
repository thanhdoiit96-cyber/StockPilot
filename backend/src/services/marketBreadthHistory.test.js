const { buildMarketBreadthHistory } = require('./marketBreadthHistory');

describe('market breadth history contract', () => {
  test('normalizes A/D metrics and keeps unavailable traded value null', () => {
    const result = buildMarketBreadthHistory([
      { session_date: '2026-09-29', advances: '2', declines: '1', unchanged: '1', classified: '4', covered: '4', universe: '5', volume_advances: '100', volume_declines: '50', volume_unchanged: '25', traded_value: null, traded_value_observations: '0' },
      { session_date: '2026-09-30', advances: '3', declines: '1', unchanged: '0', classified: '4', covered: '4', universe: '5', volume_advances: '150', volume_declines: '40', volume_unchanged: '0', traded_value: '12345', traded_value_observations: '2' }
    ], { sessions: 2, exchange: 'HSX' });
    expect(result).toMatchObject({ exchange: 'HSX', requested_sessions: 2, returned_sessions: 2, continuity: { status: 'continuous' } });
    expect(result.points[0]).toMatchObject({ ad_ratio: 2, spread: 1, coverage_pct: 80, traded_value: null });
    expect(result.points[1]).toMatchObject({ ad_ratio: 3, spread: 2, traded_value: 12345, traded_value_observations: 2 });
  });

  test('does not claim continuity for missing sessions or empty classifications', () => {
    const result = buildMarketBreadthHistory([
      { session_date: '2026-09-22', classified: 3 },
      { session_date: '2026-09-29', classified: 0 }
    ], { sessions: 3 });
    expect(result.continuity.status).toBe('insufficient_data');
    expect(result.continuity.gaps).toEqual([{ from: '2026-09-22', to: '2026-09-29', calendar_days: 7 }]);
  });
});
