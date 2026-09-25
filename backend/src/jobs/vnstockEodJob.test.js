jest.mock('node-cron', () => ({ schedule: jest.fn((_, callback) => ({ callback, stop: jest.fn() })) }));
jest.mock('../market-data/vnstockEodIngestion', () => ({ ingestVnstockEod: jest.fn(), defaultWindow: () => ({ from: '2026-09-17', to: '2026-09-24' }) }));
jest.mock('../market-data/eodCoverage', () => ({ eodCoverage: jest.fn() }));
jest.mock('node:fs/promises', () => ({ mkdir: jest.fn(), writeFile: jest.fn() }));
jest.mock('../models', () => ({}));
jest.mock('../services/recommendationPersistence', () => ({ generateRecommendationSnapshot: jest.fn() }));

const cron = require('node-cron');
const startVnstockEodJob = require('./vnstockEodJob');
const { completedSessionDate } = startVnstockEodJob;
const { ingestVnstockEod } = require('../market-data/vnstockEodIngestion');
const { eodCoverage } = require('../market-data/eodCoverage');
const fs = require('node:fs/promises');

describe('vnstock EOD scheduler', () => {
  const original = process.env.VNSTOCK_EOD_ENABLED;
  afterEach(() => { jest.clearAllMocks(); if (original === undefined) delete process.env.VNSTOCK_EOD_ENABLED; else process.env.VNSTOCK_EOD_ENABLED = original; });

  test('rolls Sunday and configured holidays back to the latest completed weekday', () => {
    expect(completedSessionDate(new Date('2026-09-27T03:00:00.000Z'))).toBe('2026-09-25');
    expect(completedSessionDate(new Date('2026-09-28T10:00:00.000Z'), new Set(['2026-09-28']))).toBe('2026-09-25');
  });

  test('starts by default so daily EOD rows cannot be silently skipped', () => {
    delete process.env.VNSTOCK_EOD_ENABLED;
    expect(startVnstockEodJob({})).toBeTruthy();
    expect(cron.schedule).toHaveBeenCalledWith('30 16 * * 1-5', expect.any(Function), { timezone: 'Asia/Ho_Chi_Minh' });
  });

  test('supports an explicit opt-out', () => {
    process.env.VNSTOCK_EOD_ENABLED = 'false';
    expect(startVnstockEodJob({})).toBeNull();
    expect(cron.schedule).not.toHaveBeenCalled();
  });

  test('retries actual session gaps and persists incomplete coverage', async () => {
    delete process.env.VNSTOCK_EOD_ENABLED;
    ingestVnstockEod.mockResolvedValue({ received: 1 });
    eodCoverage.mockResolvedValue({ symbols: 2, covered: 1, missing_symbols: ['BCG'] });
    const task = startVnstockEodJob({ logger: { info: jest.fn(), error: jest.fn() } });
    await task.callback();
    expect(ingestVnstockEod).toHaveBeenNthCalledWith(2, expect.objectContaining({ symbols: ['BCG'], from: '2026-09-25', to: '2026-09-25' }));
    const saved = JSON.parse(fs.writeFile.mock.calls[0][1]);
    expect(saved.complete).toBe(false);
    expect(saved.after.missing_symbols).toEqual(['BCG']);
  });

  test('prevents overlapping runs and records failures before releasing lock', async () => {
    delete process.env.VNSTOCK_EOD_ENABLED;
    let reject;
    ingestVnstockEod.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
    eodCoverage.mockResolvedValue({ symbols: 1, covered: 0, missing_symbols: ['FPT'] });
    const task = startVnstockEodJob({ logger: { info: jest.fn(), error: jest.fn() } });
    const first = task.callback();
    await task.callback();
    expect(ingestVnstockEod).toHaveBeenCalledTimes(1);
    reject(new Error('provider unavailable'));
    await first;
    expect(JSON.parse(fs.writeFile.mock.calls[0][1]).error).toBe('provider unavailable');
    await task.callback();
    expect(ingestVnstockEod.mock.calls.length).toBeGreaterThan(1);
  });
});
