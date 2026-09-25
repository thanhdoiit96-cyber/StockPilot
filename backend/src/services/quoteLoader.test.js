const { latestQuotes } = require('./intradayQuote');
const { createQuoteLoader } = require('./quoteLoader');

test('normalizes Vnstock thousands of VND and selects the latest Vietnam trade', () => {
  const rows = [
    { symbol: 'FPT', price: 66.3, time: '2026-09-21 10:20:24' },
    { symbol: 'FPT', price: 65, time: '2026-09-21 09:20:24+07:00' },
    { symbol: 'FPT', price: -1, time: '2026-09-21 11:20:24' },
    { symbol: 'FPT', price: 70, time: 'invalid' }
  ];
  expect(latestQuotes(rows, ['FPT']).FPT).toMatchObject({ price: 66300, price_unit: 'VND_PER_SHARE', observed_at: '2026-09-21T10:20:24+07:00' });
});

test('fetches the whole board once, deduplicates requests and refreshes expired quotes', async () => {
  let price = 66300;
  const fetcher = jest.fn(async ({ symbols, mode }) => {
    expect(mode).toBe('price-board');
    return symbols.filter(symbol => symbol !== 'BAD').map(symbol => ({ symbol, price, price_unit: 'VND_PER_SHARE', volume_type: 'session', volume: 2300000, reference_price: 65000, timestamp_kind: 'source_update', time: '2026-09-21T03:40:56Z' }));
  });
  const load = createQuoteLoader(fetcher, { ttlMs: 100 });
  const symbols = Array.from({ length: 131 }, (_, i) => 'S' + i).concat('BAD');
  const [first, duplicate] = await Promise.all([load(symbols), load(symbols)]);
  expect(first.S130.price).toBe(66300);
  expect(first.S130.volume).toBe(2300000);
  expect(first.S130.change).toBeCloseTo(2);
  expect(first.BAD).toBeUndefined();
  expect(duplicate).toEqual(first);
  expect(fetcher).toHaveBeenCalledTimes(1);
  const now = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 200);
  price = 66500;
  expect((await load(symbols)).S130.price).toBe(66500);
  now.mockRestore();
});

test('a failed board request is retried on the next refresh', async () => {
  const fetcher = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
  const load = createQuoteLoader(fetcher);
  await expect(load(['FPT'])).rejects.toThrow('offline');
  expect(await load(['FPT'])).toEqual({});
  expect(fetcher).toHaveBeenCalledTimes(2);
});
