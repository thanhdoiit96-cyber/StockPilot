const { runListingCheck } = require('./vnstockListingJob');
const cron = require('node-cron');
const { startVnstockListingJob } = require('./vnstockListingJob');

test('checks only symbols already in the database and invalidates stock cache after a successful provider response', async () => {
  const update = jest.fn();
  const Stock = {
    findAll: jest.fn().mockResolvedValue([{ code: 'FPT' }]),
    findOrCreate: jest.fn().mockResolvedValue([{ name: 'FPT', industry: null, exchange: 'HSX', listing_status: 'listed', update }, false])
  };
  const cacheService = { deleteByType: jest.fn().mockResolvedValue(1) };
  const fetchImpl = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ rows: [
    { symbol: 'FPT', name: 'FPT', exchange: 'HSX' }, { symbol: 'NEW', name: 'New code', exchange: 'HSX' }
  ] }) });
  const checkedAt = new Date('2026-09-22T08:00:00Z');

  const report = await runListingCheck({ Stock, cacheService, fetchImpl, now: () => checkedAt });

  expect(report).toMatchObject({ provider_symbols: 2, existing_symbols: 1, matched_existing_symbols: 1, checked: 1, unchanged: 1 });
  expect(report.listing_checked_at).toBe(checkedAt.toISOString());
  expect(Stock.findOrCreate).toHaveBeenCalledTimes(1);
  expect(update).toHaveBeenCalledWith({ listing_checked_at: checkedAt });
  expect(cacheService.deleteByType).toHaveBeenCalledWith('stock');
});

test('does not touch database or cache when the listing provider fails', async () => {
  const Stock = { findAll: jest.fn() };
  const cacheService = { deleteByType: jest.fn() };
  await expect(runListingCheck({ Stock, cacheService, fetchImpl: async () => ({ ok: false, status: 503, text: async () => 'upstream unavailable' }) })).rejects.toThrow('HTTP 503: upstream unavailable');
  expect(Stock.findAll).not.toHaveBeenCalled();
  expect(cacheService.deleteByType).not.toHaveBeenCalled();
});

test('registers the configured weekday schedule and skips overlapping runs', async () => {
  let tick;
  let finish;
  const runCheck = jest.fn(() => new Promise(resolve => { finish = resolve; }));
  const task = { stop: jest.fn() };
  const schedule = jest.spyOn(cron, 'schedule').mockImplementation((expression, callback, options) => {
    expect(expression).toBe('15 15 * * 1-5');
    expect(options).toEqual({ timezone: 'Asia/Ho_Chi_Minh' });
    tick = callback;
    return task;
  });
  try {
    expect(startVnstockListingJob({ cacheService: {}, schedule: '15 15 * * 1-5', timezone: 'Asia/Ho_Chi_Minh', runCheck, logger: { info: jest.fn(), error: jest.fn() } })).toBe(task);
    const first = tick();
    const overlapping = tick();
    expect(runCheck).toHaveBeenCalledTimes(1);
    finish({ checked: 131 });
    await Promise.all([first, overlapping]);
    expect(runCheck).toHaveBeenCalledTimes(1);
  } finally {
    schedule.mockRestore();
  }
});
