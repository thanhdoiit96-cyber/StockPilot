'use strict';
const path = require('path');
const models = require('../src/models');
const { readForecastPreviewArtifact } = require('../src/services/forecastPreviewArtifact');
const { materializeForecastArtifact } = require('../src/services/forecastArtifactMaterializer');
(async () => {
  const file = path.resolve(process.env.FORECAST_PREVIEW_ARTIFACT || path.resolve(__dirname, '../evidence/forecast-research-preview.json'));
  const artifact = readForecastPreviewArtifact(file);
  console.log(JSON.stringify(await materializeForecastArtifact({ artifact, models, env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' } }), null, 2));
})().catch(error => { console.error('Forecast preview materialization failed:', error.message); process.exitCode = 2; }).finally(() => models.sequelize.close());
