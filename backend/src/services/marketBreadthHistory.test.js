const { buildMarketBreadthHistory } = require('./marketBreadthHistory');

describe('market breadth history contract', () => {
  test('normalizes A/D metrics and keeps unavailable traded value null', () => {
    const result = buildMarketBreadthHistory([
      { session_date: '2026-09-29', advances: '2', declines: '1', unchanged: '1', classified: '4', covered: '4', universe: '5', volume_advances: '100', volume_declines: '50', volume_unchanged: '25', volume_observations: '4', traded_value: null, traded_value_observations: '0' },
      { session_date: '2026-09-30', advances: '3', declines: '1', unchanged: '0', classified: '4', covered: '4', universe: '5', volume_advances: '150', volume_declines: '40', volume_unchanged: '0', volume_observations: '4', traded_value: '12345', traded_value_observations: '2' }
    ], { sessions: 2, exchange: 'HSX' });
    expect(result).toMatchObject({ exchange: 'HSX', requested_sessions: 2, returned_sessions: 2, continuity: { status: 'continuous' } });
    expect(result.points[0]).toMatchObject({ ad_ratio: 2, spread: 1, coverage_pct: 80, traded_value: null });
    expect(result.points[1]).toMatchObject({ ad_ratio: 3, spread: 2, traded_value: 12345, traded_value_observations: 2 });
    expect(result.points[0].volume).toMatchObject({ observations: 4, coverage_pct: 100, directional_total: 150, total: 175, net: 50, net_pct: 33.3, ad_ratio: 2, advancing_pct: 66.7, signal: 'confirmation' });
  });

  test('labels only measured number-versus-volume divergence and keeps missing volume unavailable', () => {
    const result = buildMarketBreadthHistory([
      { session_date: '2026-09-28', advances: 3, declines: 1, classified: 4, covered: 4, universe: 4, volume_advances: 100, volume_declines: 300, volume_observations: 4 },
      { session_date: '2026-09-29', advances: 1, declines: 3, classified: 4, covered: 4, universe: 4, volume_advances: 300, volume_declines: 100, volume_observations: 4 },
      { session_date: '2026-09-30', advances: 2, declines: 1, classified: 3, covered: 3, universe: 4, volume_observations: 0 }
    ], { sessions: 3 });
    expect(result.points.map(point => point.volume.signal)).toEqual(['negative_divergence', 'positive_divergence', 'unavailable']);
    expect(result.points[2].volume.net_pct).toBeNull();
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
