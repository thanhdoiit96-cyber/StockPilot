const path = require('path');
const FixtureMarketDataAdapter = require('./adapters/FixtureMarketDataAdapter');
const { validateBatch } = require('./marketDataValidator');
const { MarketDataIngestionService } = require('./marketDataIngestionService');
const VnstockEodAdapter = require('./adapters/VnstockEodAdapter');
const { runCoverageProbe } = require('./coverageProbe');
const { createVnstockBridgeFetcher } = require('./adapters/vnstockBridgeFetcher');
const { reconcileMarketData } = require('./marketDataReconciliation');
const { EodhdEodAdapter, createEodhdFetcher, createEodhdCorporateActionFetcher } = require('./adapters/EodhdEodAdapter');

describe('market data contract and fixture adapter', () => {
  test('normalizes fixture records to canonical decimals and UTC timestamps', async () => {
    const adapter = new FixtureMarketDataAdapter({ file: path.resolve(__dirname, 'fixtures/valid-daily-quotes.json') });
    const records = await adapter.fetchQuotes({ symbols: [' fpt '] });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ interval: '1d', source: { provider: 'fixture' }, quote: { close: '123.45', currency: 'VND' } });
    expect(records[0].observed_at).toBe('2026-09-17T02:15:00.000Z');
    expect(validateBatch(records).rejected).toHaveLength(0);
  });

  test('rejects malformed, negative and unknown-symbol records without throwing', () => {
    const result = validateBatch([{ instrument: { symbol: 'FPT' }, quote: { close: '-1', currency: 'VND', price_unit: 'VND_PER_SHARE' } }]);
    expect(result.valid).toHaveLength(0);
    expect(result.rejected[0].errors.join(' ')).toMatch(/decimal|observed_at|fetched_at/);
  });

  test('inserts, skips identical duplicates and updates corrected observations', async () => {
    const stock = { id: 'stock-1', code: 'FPT' };
    const rows = [];
    const Stock = { findOne: jest.fn(async ({ where }) => where.code === 'FPT' ? stock : null) };
    const StockPrice = {
      findOne: jest.fn(async ({ where }) => rows.find(row => row.stock_id === where.stock_id && row.provider === where.provider && row.interval === where.interval && +row.observed_at === +where.observed_at) || null),
      create: jest.fn(async value => { rows.push({ ...value }); return value; })
    };
    const sequelize = { transaction: jest.fn(async () => ({ commit: jest.fn(), rollback: jest.fn() })) };
    const cacheService = { deleteByType: jest.fn(), delete: jest.fn() };
    const service = new MarketDataIngestionService({ Stock, StockPrice, sequelize, cacheService });
    const adapter = new FixtureMarketDataAdapter({ file: path.resolve(__dirname, 'fixtures/valid-daily-quotes.json') });
    const [record] = await adapter.fetchQuotes({ symbols: ['FPT'] });
    expect(await service.ingest([record, record])).toMatchObject({ inserted: 1, skipped: 1, updated: 0, rejected: 0 });
    const corrected = { ...record, quote: { ...record.quote, close: '124.00' } };
    StockPrice.findOne.mockImplementation(async ({ where }) => rows.find(row => row.stock_id === where.stock_id && row.provider === where.provider && row.interval === where.interval && +row.observed_at === +where.observed_at) || null);
    StockPrice.create.mockImplementation(async value => { rows.push({ ...value }); return value; });
    rows[0].update = jest.fn(async value => Object.assign(rows[0], value));
    expect(await service.ingest([corrected])).toMatchObject({ inserted: 0, skipped: 0, updated: 1 });
    expect(rows[0].close).toBe('124.00');
    expect(cacheService.deleteByType).toHaveBeenCalled();
  });

  test('normalizes Vnstock EOD rows and records provider/license/fetch time', async () => {
    const adapter = new VnstockEodAdapter({
      source: 'vci', now: () => new Date('2026-09-18T10:00:00.000Z'),
      fetcher: async () => [{ symbol: 'fpt', date: '2026-09-17', open: 122, high: '124.5', low: 121.8, close: 123.45, volume: 1520000 }]
    });
    const [record] = await adapter.fetchQuotes({ symbols: ['FPT'] });
    expect(record).toMatchObject({ instrument: { symbol: 'FPT' }, interval: '1d', fetched_at: '2026-09-18T10:00:00.000Z', source: { provider: 'vnstock', upstream: 'vci', license: 'personal_research_only' } });
    expect(record.quote).toMatchObject({ close: '123.45', volume: '1520000', currency: 'VND' });
    expect(validateBatch([record]).rejected).toHaveLength(0);
  });

  test('applies the Vnstock thousand-VND scale when configured', async () => {
    const adapter = new VnstockEodAdapter({
      priceScale: 1000,
      fetcher: async () => [{ symbol: 'FPT', date: '2026-09-17', open: 72.3, high: 74.8, low: 72.2, close: 74.5, volume: 100 }]
    });
    const [record] = await adapter.fetchQuotes({ symbols: ['FPT'] });
    expect(record.quote).toMatchObject({ open: '72300', close: '74500', volume: '100' });
  });

  test('coverage probe reports coverage and missing symbols', async () => {
    const adapter = new VnstockEodAdapter({
      fetcher: async () => [{ symbol: 'FPT', date: '2026-09-17', close: '123', volume: '1' }],
      now: () => new Date('2026-09-18T10:00:00.000Z')
    });
    const report = await runCoverageProbe({ adapter, symbols: ['FPT', 'HPG'], minCoverage: 1 });
    expect(report).toMatchObject({ status: 'fail', provider: 'vnstock', expected_symbols: 2, covered_symbols: 1, rejected: 0 });
    expect(report.results.find(result => result.symbol === 'HPG').pass).toBe(false);
  });

  test('bridge fetcher is configurable without coupling adapter to Python', () => {
    const fetcher = createVnstockBridgeFetcher({ python: 'python-test', bridge: 'bridge.py' });
    expect(fetcher).toEqual(expect.any(Function));
  });

  test('reconciliation classifies matching and mismatching close/volume values', async () => {
    const base = await new FixtureMarketDataAdapter().fetchQuotes({ symbols: ['FPT'] });
    const adapterA = { provider: 'provider-a', source: 'a', fetchQuotes: async () => base };
    const adapterB = { provider: 'provider-b', source: 'b', fetchQuotes: async () => [{ ...base[0], quote: { ...base[0].quote, close: '124.00', volume: '999' } }] };
    const report = await reconcileMarketData({ adapterA, adapterB, symbols: ['FPT'], closeTolerance: 0.001, volumeTolerance: 0.02 });
    expect(report.status).toBe('fail');
    expect(report.counts.close_mismatch).toBe(1);
  });

  test('classifies proportional price and volume differences as corporate action mismatch', async () => {
    const base = await new FixtureMarketDataAdapter().fetchQuotes({ symbols: ['FPT'] });
    const adjusted = { ...base[0], quote: { ...base[0].quote, close: '148.14', volume: '1824000' } };
    const report = await reconcileMarketData({
      adapterA: { provider: 'a', source: 'a', fetchQuotes: async () => base },
      adapterB: { provider: 'b', source: 'b', fetchQuotes: async () => [adjusted], fetchCorporateActions: async () => [{ symbol: 'FPT', effective_date: '2026-09-18', numerator: 6, denominator: 5, ratio: 1.2, provider: 'b' }] }, symbols: ['FPT']
    });
    expect(report.counts.matched_after_corporate_action).toBe(1);
    expect(report.status).toBe('pass');
  });

  test('EODHD adapter maps EOD rows into the market contract', async () => {
    const adapter = new EodhdEodAdapter({ fetcher: async () => [{ symbol: 'FPT', date: '2026-09-17', open: 73, high: 75, low: 72, close: 74, volume: 1000 }] });
    const [record] = await adapter.fetchQuotes({ symbols: ['FPT'], from: '2026-09-17', to: '2026-09-17' });
    expect(record).toMatchObject({ instrument: { symbol: 'FPT', provider_symbol: 'FPT.VN' }, source: { provider: 'eodhd' }, quote: { close: '74', currency: 'VND' } });
    expect(validateBatch([record]).rejected).toHaveLength(0);
  });

  test('EODHD reconciliation treats unsupported-symbol 404s as missing coverage and continues', async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce({ status: 404, ok: false })
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => [{ date: '2026-09-21', close: 74, volume: 1000 }] });
    const rows = await createEodhdFetcher({ apiKey: 'test-key', fetchImpl })({ symbols: ['VTQ', 'FPT'], from: '2026-09-21', to: '2026-09-21' });
    expect(rows).toEqual([{ symbol: 'FPT', date: '2026-09-21', close: 74, volume: 1000 }]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test('EODHD missing corporate-action endpoint is an empty action set', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ status: 404, ok: false });
    await expect(createEodhdCorporateActionFetcher({ apiKey: 'test-key', fetchImpl })({ symbols: ['VTQ'] })).resolves.toEqual([]);
  });
});
