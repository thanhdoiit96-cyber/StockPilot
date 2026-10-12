'use strict';
const models = require('../src/models');
const { forecastResearchFixture } = require('../src/services/forecastResearchFixture');
const { replayForecastDataset } = require('../src/services/forecastReplay');
const { materializeRollingForecast } = require('../src/services/forecastRolling');

(async () => {
  const asOf = process.env.FORECAST_ROLLING_AS_OF;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf || '')) throw new Error('FORECAST_ROLLING_AS_OF=YYYY-MM-DD is required');
  const fixture = forecastResearchFixture();
  if (!fixture.calendar.sessions.includes(asOf)) throw new Error('Rolling as-of is outside the synthetic fixture calendar');
  const cutoff = process.env.FORECAST_ROLLING_CUTOFF || `${asOf}T18:00:00+07:00`;
  const origins = fixture.origins.some(origin => origin.asOf === asOf) ? fixture.origins : [...fixture.origins, { asOf, cutoff }];
  const report = replayForecastDataset({ ...fixture, origins,
    evaluationCutoffs: fixture.evaluationCutoffs.filter(value => Date.parse(value) <= Date.parse(cutoff)), folds: [] });
  console.log(JSON.stringify(await materializeRollingForecast({ report, asOf, cutoff, models, env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' } }), null, 2));
})().catch(error => { console.error('Rolling forecast materialization failed:', error.message); process.exitCode = 2; }).finally(() => models.sequelize.close());
