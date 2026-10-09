jest.mock('node-cron', () => ({ schedule: jest.fn((_, callback) => ({ callback, stop: jest.fn() })) }));
jest.mock('../models', () => ({ marker: 'models' }));
jest.mock('../services/recommendationPersistence', () => ({ evaluatePendingRecommendations: jest.fn() }));

const cron = require('node-cron');
const models = require('../models');
const startRecommendationEvaluationJob = require('./recommendationEvaluationJob');
const { evaluatePendingRecommendations } = require('../services/recommendationPersistence');

describe('recommendation evaluation scheduler', () => {
  const originalEnabled = process.env.RECOMMENDATION_EVALUATION_ENABLED;
  const originalTimezone = process.env.RECOMMENDATION_EVALUATION_TIMEZONE;
  afterEach(() => {
    jest.clearAllMocks();
    if (originalEnabled === undefined) delete process.env.RECOMMENDATION_EVALUATION_ENABLED; else process.env.RECOMMENDATION_EVALUATION_ENABLED = originalEnabled;
    if (originalTimezone === undefined) delete process.env.RECOMMENDATION_EVALUATION_TIMEZONE; else process.env.RECOMMENDATION_EVALUATION_TIMEZONE = originalTimezone;
  });

  test('does not schedule evaluation unless explicitly enabled', () => {
    delete process.env.RECOMMENDATION_EVALUATION_ENABLED;
    expect(startRecommendationEvaluationJob()).toBeNull();
    expect(cron.schedule).not.toHaveBeenCalled();
  });

  test('runs the evaluator with models in the configured Vietnam schedule', async () => {
    process.env.RECOMMENDATION_EVALUATION_ENABLED = 'true';
    process.env.RECOMMENDATION_EVALUATION_TIMEZONE = 'Asia/Ho_Chi_Minh';
    evaluatePendingRecommendations.mockResolvedValue({ status: 'completed', measured: 1 });
    const logger = { info: jest.fn(), error: jest.fn() };
    const task = startRecommendationEvaluationJob({ logger, schedule: '45 16 * * 1-5' });
    expect(cron.schedule).toHaveBeenCalledWith('45 16 * * 1-5', expect.any(Function), { timezone: 'Asia/Ho_Chi_Minh' });
    await task.callback();
    expect(evaluatePendingRecommendations).toHaveBeenCalledWith(models);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('"measured":1'));
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('records evaluator failures without throwing from the scheduled callback', async () => {
    process.env.RECOMMENDATION_EVALUATION_ENABLED = 'true';
    evaluatePendingRecommendations.mockRejectedValue(new Error('database unavailable'));
    const logger = { info: jest.fn(), error: jest.fn() };
    const task = startRecommendationEvaluationJob({ logger });
    await expect(task.callback()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('database unavailable'));
  });
});
