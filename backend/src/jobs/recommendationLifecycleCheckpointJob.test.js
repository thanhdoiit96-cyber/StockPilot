jest.mock('node-cron', () => ({ schedule: jest.fn((_, callback) => ({ callback, stop: jest.fn() })) }));

const cron = require('node-cron');
const startRecommendationLifecycleCheckpointJob = require('./recommendationLifecycleCheckpointJob');

describe('recommendation lifecycle checkpoint scheduler', () => {
  const originalEnabled = process.env.RECOMMENDATION_LIFECYCLE_CHECK_ENABLED;
  afterEach(() => {
    jest.clearAllMocks();
    if (originalEnabled === undefined) delete process.env.RECOMMENDATION_LIFECYCLE_CHECK_ENABLED; else process.env.RECOMMENDATION_LIFECYCLE_CHECK_ENABLED = originalEnabled;
  });

  test('runs a read-only checkpoint after EOD in the Vietnam timezone', async () => {
    delete process.env.RECOMMENDATION_LIFECYCLE_CHECK_ENABLED;
    const readCheckpoint = jest.fn().mockResolvedValue({ status: 'ready_to_generate' });
    const logger = { info: jest.fn(), error: jest.fn() };
    const task = startRecommendationLifecycleCheckpointJob({ logger, readCheckpoint });
    expect(cron.schedule).toHaveBeenCalledWith('0 15 * * 1-5', expect.any(Function), { timezone: 'Asia/Ho_Chi_Minh' });
    await task.callback();
    expect(readCheckpoint).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('ready_to_generate'));
  });

  test('supports an explicit opt-out and contains checkpoint errors', async () => {
    process.env.RECOMMENDATION_LIFECYCLE_CHECK_ENABLED = 'false';
    expect(startRecommendationLifecycleCheckpointJob()).toBeNull();
    expect(cron.schedule).not.toHaveBeenCalled();
    process.env.RECOMMENDATION_LIFECYCLE_CHECK_ENABLED = 'true';
    const logger = { info: jest.fn(), error: jest.fn() };
    const task = startRecommendationLifecycleCheckpointJob({ logger, readCheckpoint: jest.fn().mockRejectedValue(new Error('database unavailable')) });
    await expect(task.callback()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('database unavailable'));
  });
});
