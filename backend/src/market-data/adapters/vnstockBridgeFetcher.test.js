const { createVnstockBridgeFetcher, createVnstockIntradayFetcher, createVnstockForeignFlowFetcher } = require('./vnstockBridgeFetcher');

describe('Vnstock worker HTTP failures', () => {
  const previousWorkerUrl = process.env.VNSTOCK_WORKER_URL;
  beforeEach(() => { process.env.VNSTOCK_WORKER_URL = 'http://worker.test'; });
  afterAll(() => {
    if (previousWorkerUrl == null) delete process.env.VNSTOCK_WORKER_URL;
    else process.env.VNSTOCK_WORKER_URL = previousWorkerUrl;
  });

  test.each([
    ['EOD', options => createVnstockBridgeFetcher(options), { symbols: ['FPT'], source: 'vci' }],
    ['intraday', options => createVnstockIntradayFetcher(options), { symbols: ['FPT'], mode: 'price-board' }]
  ])('%s fetcher preserves bounded upstream error detail and redacts credentials', async (_name, createFetcher, request) => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ errors: [{ error: 'connect failed at https://feed.test/quote?api_key=secretvalue&symbol=FPT' }] })
    });
    const fetch = createFetcher({ retries: 0, timeoutMs: 1000, fetchImpl });

    await expect(fetch(request)).rejects.toThrow('vnstock worker HTTP 500: connect failed at https://feed.test/quote?api_key=[redacted]&symbol=FPT');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('foreign-flow fetcher fails clearly when sponsor capability is unavailable', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ rows: [], errors: [{ symbol: 'FPT', error: 'foreign_flow capability is unavailable' }] }) });
    await expect(createVnstockForeignFlowFetcher({ timeoutMs: 1000, fetchImpl })({ symbols: ['FPT'] })).rejects.toThrow('foreign-flow unavailable');
  });
});

describe('Vnstock worker EOD batching', () => {
  const previousWorkerUrl = process.env.VNSTOCK_WORKER_URL;
  afterAll(() => {
    if (previousWorkerUrl == null) delete process.env.VNSTOCK_WORKER_URL;
    else process.env.VNSTOCK_WORKER_URL = previousWorkerUrl;
  });

  test('splits large worker requests into safe batches and merges rows', async () => {
    process.env.VNSTOCK_WORKER_URL = 'http://worker.test';
    const fetchImpl = jest.fn(async (_url, options) => {
      const body = JSON.parse(options.body);
      return { ok: true, json: async () => ({ rows: body.symbols.map(symbol => ({ symbol, date: '2026-09-22', close: 1 })) }) };
    });
    const fetch = createVnstockBridgeFetcher({ retries: 0, workerBatchSize: 2, fetchImpl });
    const rows = await fetch({ symbols: ['FPT', 'SSI', 'VCB', 'HPG', 'BSR'], source: 'vci' });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(rows.map(row => row.symbol)).toEqual(['FPT', 'SSI', 'VCB', 'HPG', 'BSR']);
    expect(fetchImpl.mock.calls.map(([, options]) => JSON.parse(options.body).symbols.length)).toEqual([2, 2, 1]);
  });

  test('keeps successful chunks when one worker chunk resets', async () => {
    process.env.VNSTOCK_WORKER_URL = 'http://worker.test';
    const fetchImpl = jest.fn(async (_url, options) => {
      const body = JSON.parse(options.body);
      if (body.symbols.includes('SSI')) throw new Error('connection reset');
      return { ok: true, json: async () => ({ rows: body.symbols.map(symbol => ({ symbol, date: '2026-09-22', close: 1 })) }) };
    });
    const fetch = createVnstockBridgeFetcher({ retries: 0, workerBatchSize: 2, fetchImpl });
    const rows = await fetch({ symbols: ['FPT', 'VCB', 'SSI', 'HPG'], source: 'vci' });
    expect(rows.map(row => row.symbol)).toEqual(['FPT', 'VCB']);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
