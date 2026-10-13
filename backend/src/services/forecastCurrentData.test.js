const { fetchCurrentForecastData } = require('./forecastCurrentData');

describe('forecast current-data fetch', () => {
  test('accepts fresh current-market rows for live forecasting', async () => {
    const fetchQuotes = jest.fn(async () => [{
      instrument: { symbol: 'FPT' },
      observed_at: '2026-10-12T02:00:00.000Z',
      quote: { close: '123.45', volume: '1000', currency: 'VND' }
    }]);
    const adapter = {
      provider: 'vnstock',
      fetchQuotes
    };

    const result = await fetchCurrentForecastData({
      adapter,
      symbols: ['FPT'],
      now: new Date('2026-10-12T05:00:00.000Z'),
      maximumStalenessDays: 7,
      localOnly: true,
      license: ''
    });

    expect(result).toMatchObject({
      status: 'current_data_ready',
      live: true,
      research_only: false,
      market_accuracy_verified: false,
      provider: 'vnstock',
      as_of: '2026-10-12T02:00:00.000Z'
    });
    expect(fetchQuotes).toHaveBeenCalledWith({ symbols: ['FPT'], from: '2026-06-14', to: '2026-10-12' });
  });

  test('rejects stale historical rows before any live forecast can be produced', async () => {
    const adapter = {
      provider: 'vnstock',
      fetchQuotes: async () => [{
        instrument: { symbol: 'FPT' },
        observed_at: '2026-03-18T02:00:00.000Z',
        quote: { close: '123.45', volume: '1000', currency: 'VND' }
      }]
    };

    await expect(fetchCurrentForecastData({
      adapter,
      symbols: ['FPT'],
      now: new Date('2026-10-12T05:00:00.000Z'),
      maximumStalenessDays: 7,
      localOnly: true,
      license: ''
    })).rejects.toThrow('live_forecast_gate_not_passed');
  });
});
