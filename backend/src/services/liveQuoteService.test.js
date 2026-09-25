const { createLiveQuoteService } = require('./liveQuoteService');
const trade = symbol => ({ symbol, price: 66, time: '2026-09-25T10:00:00+07:00' });
const start = Date.parse('2026-09-25T10:01:00+07:00');

test('coalesces overlapping page requests per symbol and bounds concurrency', async () => {
  const releases = [];
  let active = 0, peak = 0;
  const fetcher = jest.fn(({ symbols }) => new Promise(resolve => {
    active++; peak = Math.max(peak, active);
    releases.push(() => { active--; resolve(symbols.map(trade)); });
  }));
  const service = createLiveQuoteService(fetcher, { now: () => start, concurrency: 2 });
  const overview = service.load(['FPT', 'SSI', 'VCB']);
  const detail = service.load(['FPT']);
  await new Promise(resolve => setImmediate(resolve));
  expect(fetcher).toHaveBeenCalledTimes(2);
  releases.splice(0).forEach(release => release());
  await new Promise(resolve => setImmediate(resolve));
  releases.splice(0).forEach(release => release());
  expect(Object.keys(await overview)).toHaveLength(2);
  expect((await detail).FPT.price).toBe(66000);
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(peak).toBe(2);
});

test('retains dated cache on empty refresh but expires it and never crosses sessions', async () => {
  let time = start;
  const fetcher = jest.fn().mockResolvedValueOnce([trade('FPT')]).mockResolvedValue([]);
  const service = createLiveQuoteService(fetcher, { now: () => time });
  const first = await service.load(['FPT']);
  time += 11000;
  const stale = await service.load(['FPT']);
  expect(stale.FPT).toMatchObject({ stale: true, observed_at: first.FPT.observed_at, fetched_at: first.FPT.fetched_at });
  time += 91000;
  expect(await service.load(['FPT'])).toEqual({});
  time += 86400000;
  expect(service.peek(['FPT'])).toEqual({});
});

test('a slow request returns within the page budget and shares its eventual result', async () => {
  jest.useFakeTimers();
  let complete;
  const fetcher = jest.fn(() => new Promise(resolve => { complete = resolve; }));
  const service = createLiveQuoteService(fetcher, { now: () => start });
  const loading = service.load(['FPT'], { waitMs: 1500 });
  await jest.advanceTimersByTimeAsync(1500);
  expect(await loading).toEqual({});
  complete([trade('FPT')]);
  await jest.advanceTimersByTimeAsync(0);
  expect((await service.load(['FPT'])).FPT.price).toBe(66000);
  expect(fetcher).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});

test('opens a short circuit after consecutive provider failures and exposes health', async () => {
  let time = start;
  const fetcher = jest.fn().mockRejectedValue(new Error('provider reset'));
  const service = createLiveQuoteService(fetcher, { now: () => time, failureThreshold: 2, cooldownMs: 30000 });
  await service.load(['FPT'], { waitMs: 100 });
  time += 6000;
  await service.load(['FPT'], { waitMs: 100 });
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(service.health()).toMatchObject({ status: 'circuit_open', circuit_open: true, consecutive_failures: 2 });
  time += 6000;
  await service.load(['FPT'], { waitMs: 100 });
  expect(fetcher).toHaveBeenCalledTimes(2);
});

test('uses one provider request for an overview universe and retains partial rows', async () => {
  const fetcher = jest.fn().mockResolvedValue(['FPT', 'SSI', 'VCB', 'HPG', 'VCI', 'VNM'].map(symbol => trade(symbol)));
  const service = createLiveQuoteService(fetcher, { now: () => start });
  const quotes = await service.load(['FPT', 'SSI', 'VCB', 'HPG', 'VCI', 'VNM'], { waitMs: 500 });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(Object.keys(quotes)).toHaveLength(6);
  expect(service.health().successes).toBe(1);
});
