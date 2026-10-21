jest.mock('node-cron', () => ({ schedule: jest.fn((_, callback) => ({ callback, stop: jest.fn() })) }));
jest.mock('../market-data/vnstockEodIngestion', () => ({ ingestVnstockEod: jest.fn(), defaultWindow: () => ({ from: '2026-09-17', to: '2026-09-24' }) }));
jest.mock('../market-data/eodCoverage', () => ({ eodCoverage: jest.fn() }));
jest.mock('node:fs/promises', () => ({ mkdir: jest.fn(), writeFile: jest.fn() }));
jest.mock('../models', () => ({}));
jest.mock('../services/recommendationPersistence', () => ({ generateRecommendationSnapshot: jest.fn() }));

const cron = require('node-cron');
const startVnstockEodJob = require('./vnstockEodJob');
const { completedSessionDate, prioritizeMissingSymbols, findCurrentSessionTradedSymbols } = startVnstockEodJob;
const { ingestVnstockEod } = require('../market-data/vnstockEodIngestion');
const { eodCoverage } = require('../market-data/eodCoverage');
const fs = require('node:fs/promises');
const { generateRecommendationSnapshot } = require('../services/recommendationPersistence');

describe('vnstock EOD scheduler', () => {
  const original = process.env.VNSTOCK_EOD_ENABLED;
  const originalRetryLimit = process.env.VNSTOCK_EOD_GAP_RETRY_LIMIT;
  const originalRecommendationsAfterIngest = process.env.RECOMMENDATIONS_AFTER_INGEST;
  const originalRepairPrevious = process.env.VNSTOCK_EOD_REPAIR_PREVIOUS;
  beforeEach(() => { jest.useFakeTimers({ now: new Date('2026-09-27T10:00:00.000Z') }); });
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    if (original === undefined) delete process.env.VNSTOCK_EOD_ENABLED; else process.env.VNSTOCK_EOD_ENABLED = original;
    if (originalRetryLimit === undefined) delete process.env.VNSTOCK_EOD_GAP_RETRY_LIMIT; else process.env.VNSTOCK_EOD_GAP_RETRY_LIMIT = originalRetryLimit;
    if (originalRecommendationsAfterIngest === undefined) delete process.env.RECOMMENDATIONS_AFTER_INGEST; else process.env.RECOMMENDATIONS_AFTER_INGEST = originalRecommendationsAfterIngest;
    if (originalRepairPrevious === undefined) delete process.env.VNSTOCK_EOD_REPAIR_PREVIOUS; else process.env.VNSTOCK_EOD_REPAIR_PREVIOUS = originalRepairPrevious;
  });

  test('rolls Sunday and configured holidays back to the latest completed weekday', () => {
    expect(completedSessionDate(new Date('2026-09-27T03:00:00.000Z'))).toBe('2026-09-25');
    expect(completedSessionDate(new Date('2026-09-28T10:00:00.000Z'), new Set(['2026-09-28']))).toBe('2026-09-25');
  });

  test('rotates gap retries before reusing high-volume symbols', async () => {
    const sequelize = { query: jest.fn().mockResolvedValue([[
      { code: 'AAA', volume: '1000' },
      { code: 'BBB', volume: '500' },
      { code: 'CCC', volume: '0' }
    ]]) };
    const attempts = new Map([['AAA', 1]]);
    await expect(prioritizeMissingSymbols(sequelize, '2026-10-02', ['AAA', 'BBB', 'CCC'], 2, attempts))
      .resolves.toEqual(['BBB', 'CCC']);
    expect(sequelize.query.mock.calls[0][1].bind).toEqual([['AAA', 'BBB', 'CCC'], '2026-10-02']);
  });

  test('detects traded symbols only from a positive current-session price-board row', async () => {
    const fetcher = jest.fn()
      .mockResolvedValueOnce([
        { symbol: 'AAA', price: 12000, volume: 100, time: '2026-10-02T07:45:00Z' },
        { symbol: 'BBB', price: 8000, volume: 0, time: '2026-10-02T06:00:00Z' }
      ])
      .mockResolvedValueOnce([
        { symbol: 'CCC', price: 5000, volume: 20, time: '2026-10-01T07:45:00Z' }
      ]);
    await expect(findCurrentSessionTradedSymbols(['aaa', 'BBB', 'CCC'], '2026-10-02', { fetcher, batchSize: 2 }))
      .resolves.toEqual({ symbols: ['AAA'], probed: 3, batches: 2, failed_batches: 0, errors: [] });
    expect(fetcher).toHaveBeenNthCalledWith(1, { symbols: ['AAA', 'BBB'], source: 'VCI', mode: 'price-board' });
    expect(fetcher).toHaveBeenNthCalledWith(2, { symbols: ['CCC'], source: 'VCI', mode: 'price-board' });
  });

  test('starts by default so daily EOD rows cannot be silently skipped', () => {
    delete process.env.VNSTOCK_EOD_ENABLED;
    expect(startVnstockEodJob({})).toBeTruthy();
    expect(cron.schedule).toHaveBeenCalledWith('30 15 * * 1-5', expect.any(Function), { timezone: 'Asia/Ho_Chi_Minh' });
    expect(cron.schedule).toHaveBeenCalledWith('*/15 16-19 * * 1-5', expect.any(Function), { timezone: 'Asia/Ho_Chi_Minh' });
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

  test('does not generate recommendations when the EOD session remains incomplete', async () => {
    process.env.RECOMMENDATIONS_AFTER_INGEST = 'true';
    ingestVnstockEod.mockResolvedValue({ received: 1 });
    eodCoverage.mockImplementation((_, __, ___, options) => Promise.resolve(options?.minimumHistoricalSessions ? { symbols: 1, covered: 0, missing_symbols: ['BCG'] } : { symbols: 2, covered: 1, missing_symbols: ['BCG'] }));
    const task = startVnstockEodJob({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } });
    await task.callback();
    expect(generateRecommendationSnapshot).not.toHaveBeenCalled();
    const saved = JSON.parse(fs.writeFile.mock.calls[0][1]);
    expect(saved.recommendations).toEqual(expect.objectContaining({ status: 'skipped_incomplete_recommendation_coverage', missing_symbols: 1, minimum_historical_sessions: 50 }));
  });

  test('creates an EOD-only recommendation snapshot after complete coverage', async () => {
    process.env.RECOMMENDATIONS_AFTER_INGEST = 'true';
    process.env.VNSTOCK_EOD_REPAIR_PREVIOUS = 'false';
    ingestVnstockEod.mockResolvedValue({ received: 2 });
    eodCoverage.mockResolvedValue({ symbols: 2, covered: 2, missing_symbols: [] });
    generateRecommendationSnapshot.mockResolvedValue({ run_id: 'sealed-run', snapshot_sha256: 'a'.repeat(64) });
    const task = startVnstockEodJob({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } });
    await task.callback();
    expect(generateRecommendationSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'vnstock', useIntradayReference: false, horizonDays: 20,
    }));
    expect(eodCoverage).toHaveBeenCalledWith(undefined, '2026-09-25', null, { minimumHistoricalSessions: 50 });
    const saved = JSON.parse(fs.writeFile.mock.calls[0][1]);
    expect(saved.recommendations).toEqual(expect.objectContaining({ run_id: 'sealed-run', snapshot_sha256: 'a'.repeat(64) }));
  });

  test('creates a snapshot when the model-eligible EOD universe is complete even if the full listed universe is not', async () => {
    process.env.RECOMMENDATIONS_AFTER_INGEST = 'true';
    process.env.VNSTOCK_EOD_REPAIR_PREVIOUS = 'false';
    ingestVnstockEod.mockResolvedValue({ received: 549 });
    eodCoverage.mockImplementation((_, __, ___, options) => Promise.resolve(options?.minimumHistoricalSessions
      ? { symbols: 120, covered: 120, missing_symbols: [] }
      : { symbols: 759, covered: 549, missing_symbols: ['NEW'] }));
    generateRecommendationSnapshot.mockResolvedValue({ run_id: 'eligible-run' });
    const task = startVnstockEodJob({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } });
    await task.callback();
    expect(generateRecommendationSnapshot).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(fs.writeFile.mock.calls[0][1]);
    expect(saved.after).toMatchObject({ symbols: 759, covered: 549 });
    expect(saved.recommendation_coverage).toEqual({ symbols: 120, covered: 120, missing_symbols: [] });
  });

  test('repeats configured gap retry passes while symbols remain missing', async () => {
    process.env.VNSTOCK_EOD_GAP_RETRIES = '2';
    ingestVnstockEod.mockResolvedValue({ received: 0 });
    eodCoverage
      .mockResolvedValueOnce({ symbols: 1, covered: 0, missing_symbols: ['VPB'] })
      .mockResolvedValueOnce({ symbols: 1, covered: 0, missing_symbols: ['VPB'] })
      .mockResolvedValueOnce({ symbols: 1, covered: 0, missing_symbols: ['VPB'] })
      .mockResolvedValueOnce({ symbols: 1, covered: 0, missing_symbols: ['VPB'] });
    const task = startVnstockEodJob({ logger: { info: jest.fn(), error: jest.fn() } });
    await task.callback();
    expect(ingestVnstockEod).toHaveBeenCalledTimes(3);
    expect(JSON.parse(fs.writeFile.mock.calls[0][1]).retries).toHaveLength(2);
  });

  test('exposes a scheduled gap retry task that only requests missing symbols', async () => {
    ingestVnstockEod.mockResolvedValue({ received: 1 });
    eodCoverage
      .mockResolvedValueOnce({ symbols: 2, covered: 1, missing_symbols: ['VPB'] })
      .mockResolvedValueOnce({ symbols: 2, covered: 2, missing_symbols: [] })
      .mockResolvedValueOnce({ symbols: 2, covered: 2, missing_symbols: [] });
    const tradePriorityLoader = jest.fn().mockResolvedValue({ symbols: ['VPB'], probed: 1, batches: 1, failed_batches: 0, errors: [] });
    const task = startVnstockEodJob({ logger: { info: jest.fn(), error: jest.fn() }, tradePriorityLoader });
    await task.retryGaps();
    expect(ingestVnstockEod).toHaveBeenCalledWith(expect.objectContaining({ symbols: ['VPB'], from: '2026-09-25', to: '2026-09-25' }));
    expect(tradePriorityLoader).toHaveBeenCalledWith(['VPB'], '2026-09-25');
    const saved = JSON.parse(fs.writeFile.mock.calls[0][1]);
    expect(saved.trade_priority).toEqual(expect.objectContaining({ enabled: true, matched: 1 }));
    expect(saved.selected_traded).toBe(1);
    expect(task.retryTask).toBeTruthy();
  });

  test('puts currently traded gaps before fair-order fallback without fabricating EOD rows', async () => {
    process.env.VNSTOCK_EOD_GAP_RETRY_LIMIT = '1';
    ingestVnstockEod.mockResolvedValue({ received: 1 });
    eodCoverage
      .mockResolvedValueOnce({ symbols: 3, covered: 1, missing_symbols: ['AAA', 'VPC'] })
      .mockResolvedValueOnce({ symbols: 1, covered: 1, missing_symbols: [] })
      .mockResolvedValueOnce({ symbols: 3, covered: 2, missing_symbols: ['AAA'] });
    const tradePriorityLoader = jest.fn().mockResolvedValue({ symbols: ['VPC'], probed: 2, batches: 1, failed_batches: 0, errors: [] });
    const task = startVnstockEodJob({ logger: { info: jest.fn(), error: jest.fn() }, tradePriorityLoader });
    const result = await task.retryGaps();
    expect(ingestVnstockEod).toHaveBeenCalledTimes(1);
    expect(ingestVnstockEod).toHaveBeenCalledWith(expect.objectContaining({ symbols: ['VPC'] }));
    expect(result.selected_symbols).toEqual(['VPC']);
    expect(result.selected_traded).toBe(1);
  });

  test('keeps the fair retry path available when price-board prioritization fails', async () => {
    process.env.VNSTOCK_EOD_GAP_RETRY_LIMIT = '1';
    ingestVnstockEod.mockResolvedValue({ received: 0 });
    eodCoverage
      .mockResolvedValueOnce({ symbols: 2, covered: 0, missing_symbols: ['AAA', 'BBB'] })
      .mockResolvedValueOnce({ symbols: 1, covered: 0, missing_symbols: ['AAA'] })
      .mockResolvedValueOnce({ symbols: 2, covered: 0, missing_symbols: ['AAA', 'BBB'] });
    const task = startVnstockEodJob({
      logger: { info: jest.fn(), error: jest.fn() },
      tradePriorityLoader: jest.fn().mockRejectedValue(new Error('price board unavailable'))
    });
    const result = await task.retryGaps();
    expect(ingestVnstockEod).toHaveBeenCalledWith(expect.objectContaining({ symbols: ['AAA'] }));
    expect(result.trade_priority).toEqual(expect.objectContaining({ enabled: true, matched: 0, error: 'price board unavailable' }));
    expect(result.error).toBeUndefined();
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
