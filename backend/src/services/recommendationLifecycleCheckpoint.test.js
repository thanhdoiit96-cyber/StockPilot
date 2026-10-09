'use strict';

const { readRecommendationLifecycleCheckpoint } = require('./recommendationLifecycleCheckpoint');

test('reads only the newest EOD observation and reports the generation gate', async () => {
  const StockPrice = { findOne: jest.fn().mockResolvedValue({ observed_at: '2026-10-08T00:00:00.000Z' }) };
  const RecommendationRun = { findOne: jest.fn().mockResolvedValue(null) };
  const report = await readRecommendationLifecycleCheckpoint({ StockPrice, RecommendationRun, now: new Date('2026-10-09T04:00:00.000Z') });
  expect(report).toMatchObject({ provider: 'vnstock', status: 'awaiting_eod', expected_session: '2026-10-09', latest_eod_session: '2026-10-08', can_generate: false });
  expect(StockPrice.findOne).toHaveBeenCalledWith(expect.objectContaining({ attributes: ['observed_at'], order: [['observed_at', 'DESC']] }));
});
