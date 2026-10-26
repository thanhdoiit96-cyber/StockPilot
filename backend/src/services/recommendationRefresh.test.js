'use strict';
jest.mock('../market-data/eodCoverage', () => ({ eodCoverage: jest.fn() }));
jest.mock('./recommendationPersistence', () => ({ ...jest.requireActual('./recommendationPersistence'), generateRecommendationSnapshot: jest.fn() }));
const { eodCoverage } = require('../market-data/eodCoverage');
const { generateRecommendationSnapshot } = require('./recommendationPersistence');
const { refreshRecommendations } = require('./recommendationRefresh');
const models = { sequelize: {} };
const now = new Date('2026-10-26T02:00:00Z');
const env = { RECOMMENDATIONS_AFTER_INGEST: 'true' };
beforeEach(() => jest.clearAllMocks());
test('disabled catch-up does not query or generate', async () => {
  await expect(refreshRecommendations({ models, now, env: {} })).resolves.toEqual({ status: 'disabled' });
  expect(eodCoverage).not.toHaveBeenCalled();
  expect(generateRecommendationSnapshot).not.toHaveBeenCalled();
});
test.each([{ symbols: 0, covered: 0, missing_symbols: [] }, { symbols: 123, covered: 122, missing_symbols: ['AAA'] }])('incomplete coverage fails closed: %j', async coverage => {
  eodCoverage.mockResolvedValue(coverage);
  await expect(refreshRecommendations({ models, now, env })).resolves.toMatchObject({ status: 'skipped_incomplete_recommendation_coverage', expected_session: '2026-10-23' });
  expect(generateRecommendationSnapshot).not.toHaveBeenCalled();
});
test('complete stored EOD delegates to the idempotent writer with the same clock', async () => {
  eodCoverage.mockResolvedValue({ symbols: 123, covered: 123, missing_symbols: [] });
  generateRecommendationSnapshot.mockResolvedValue({ status: 'snapshot_exists', run_id: 'existing' });
  await expect(refreshRecommendations({ models, now, env })).resolves.toMatchObject({ status: 'snapshot_exists', run_id: 'existing' });
  expect(eodCoverage).toHaveBeenCalledWith(models.sequelize, '2026-10-23', null, { minimumHistoricalSessions: 50 });
  expect(generateRecommendationSnapshot).toHaveBeenCalledWith(expect.objectContaining({ now, useIntradayReference: false, provider: 'vnstock', limit: 5, horizonDays: 20 }));
});
