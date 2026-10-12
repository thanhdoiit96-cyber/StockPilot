'use strict';
const path = require('path');
const { readForecastPreviewArtifact } = require('../src/services/forecastPreviewArtifact');
try {
  const file = path.resolve(process.env.FORECAST_PREVIEW_ARTIFACT || path.resolve(__dirname, '../evidence/forecast-research-preview.json'));
  const artifact = readForecastPreviewArtifact(file);
  if (artifact.freshness !== 'fresh') throw new Error('Forecast preview artifact is stale');
  console.log(JSON.stringify({ valid: true, sha256: artifact.sha256, generated_at: artifact.payload.generated_at, freshness: artifact.freshness, horizons: artifact.payload.previews.map(item => item.horizon_sessions) }));
} catch (error) {
  console.error('Forecast preview verification failed:', error.message);
  process.exitCode = 2;
}
