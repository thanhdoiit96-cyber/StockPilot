const cron = require('node-cron');
const { startQuoteFreshnessJob } = require('./quoteFreshnessJob');

test('registers two weekday probe times in the Vietnam timezone and prevents overlap', async () => {
  let tick;
  let finish;
  const runProbe = jest.fn(() => new Promise(resolve => { finish = resolve; }));
  const logger = { info: jest.fn(), error: jest.fn() };
  const task = { stop: jest.fn() };
  const schedule = jest.spyOn(cron, 'schedule').mockImplementation((expression, callback, options) => {
    expect(expression).toBe('35 9,13 * * 1-5');
    expect(options).toEqual({ timezone: 'Asia/Ho_Chi_Minh' });
    tick = callback;
    return task;
  });
  try {
    expect(startQuoteFreshnessJob({ runProbe, logger, now: () => new Date('2026-09-23T02:35:00Z') })).toBe(task);
    const first = tick();
    const overlapping = tick();
    expect(runProbe).toHaveBeenCalledTimes(1);
    finish({ returned: 5, error: null });
    await Promise.all([first, overlapping]);
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(runProbe).toHaveBeenCalledTimes(1);
  } finally {
    schedule.mockRestore();
  }
});

test('does not launch an in-session probe when an overridden schedule fires outside market hours', async () => {
  let tick;
  const runProbe = jest.fn();
  const schedule = jest.spyOn(cron, 'schedule').mockImplementation((expression, callback) => { tick = callback; return { stop: jest.fn() }; });
  try {
    startQuoteFreshnessJob({ schedule: '* * * * *', runProbe, now: () => new Date('2026-09-23T04:30:00Z') });
    await tick();
    expect(runProbe).not.toHaveBeenCalled();
  } finally {
    schedule.mockRestore();
  }
});
