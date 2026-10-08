const { classifyMarketIndexSeries, loadMarketIndexSeries, validateMarketIndexSeries } = require('./marketIndexSeriesService');

const series = () => ({
  symbol: 'VNINDEX', provider: 'licensed-provider', license: 'display-approved-2026', source_url: 'https://provider.example.vn/index/VNINDEX',
  session_timezone: 'Asia/Ho_Chi_Minh', return_type: 'price_return', observed_at: '2026-10-08T07:45:00.000Z', stale_after_seconds: 300,
  previous_close: { session_date: '2026-10-07', close: 1275 },
  points: [{ session_date: '2026-10-06', close: 1260 }, { session_date: '2026-10-07', close: 1275 }],
  intraday_points: [{ observed_at: '2026-10-08T02:15:00.000Z', close: 1272 }, { observed_at: '2026-10-08T07:45:00.000Z', close: 1280 }]
});

describe('market index series service', () => {
  test('accepts explicit provider provenance and classifies freshness without changing the payload', () => {
    const input = series();
    expect(validateMarketIndexSeries(input)).toEqual({ valid: true, reasons: [] });
    expect(classifyMarketIndexSeries(input, new Date('2026-10-08T07:47:00.000Z'))).toMatchObject({ status: 'fresh', code: null, data: input });
    expect(classifyMarketIndexSeries(input, new Date('2026-10-08T07:51:00.000Z'))).toMatchObject({ status: 'stale', code: null, data: input });
  });

  test('does not treat fixtures or malformed points as usable provider data', () => {
    const input = series();
    input.provider = 'fixture';
    input.intraday_points.reverse();
    expect(classifyMarketIndexSeries(input)).toEqual(expect.objectContaining({ status: 'error', code: 'market_index_contract_invalid', reasons: ['unapproved_provider', 'invalid_intraday_points'], data: null }));
  });

  test('reports an unavailable adapter and isolates adapter failures', async () => {
    await expect(loadMarketIndexSeries()).resolves.toEqual({ status: 'error', code: 'market_index_provider_unavailable', items: [] });
    await expect(loadMarketIndexSeries({ fetchIndexSeries: async () => { throw new Error('provider down'); } })).resolves.toEqual({ status: 'error', code: 'market_index_provider_failed', items: [] });
  });

  test('preserves mixed fresh and stale item statuses for the eventual controller', async () => {
    const stale = series(); stale.symbol = 'VN30'; stale.observed_at = '2026-10-08T07:00:00.000Z'; stale.intraday_points = [{ observed_at: '2026-10-08T02:15:00.000Z', close: 1272 }, { observed_at: '2026-10-08T07:00:00.000Z', close: 1280 }];
    const result = await loadMarketIndexSeries({ fetchIndexSeries: async () => [series(), stale] }, { now: new Date('2026-10-08T07:47:00.000Z') });
    expect(result.status).toBe('fresh');
    expect(result.items.map(item => item.status)).toEqual(['fresh', 'stale']);
  });
});
