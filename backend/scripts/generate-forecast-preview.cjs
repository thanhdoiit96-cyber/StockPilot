'use strict';
const fs = require('fs');
const path = require('path');
const { forecastResearchFixture } = require('../src/services/forecastResearchFixture');
const { replayForecastDataset } = require('../src/services/forecastReplay');
const { createForecastPreviewArtifact } = require('../src/services/forecastPreviewArtifact');
try {
  const output = path.resolve(process.env.FORECAST_PREVIEW_ARTIFACT || path.resolve(__dirname, '../evidence/forecast-research-preview.json'));
  const artifact = createForecastPreviewArtifact(replayForecastDataset(forecastResearchFixture()));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(artifact, null, 2), { encoding: 'utf8', flag: 'wx' });
  fs.renameSync(temporary, output);
  console.log(JSON.stringify({ artifact: output, sha256: artifact.sha256, generated_at: artifact.payload.generated_at, horizons: artifact.payload.previews.map(item => item.horizon_sessions) }));
} catch (error) {
  console.error('Forecast preview generation failed:', error.message);
  process.exitCode = 2;
}
