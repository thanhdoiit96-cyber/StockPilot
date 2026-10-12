const { forecastResearchFixture } = require('./forecastResearchFixture');
const { replayForecastDataset } = require('./forecastReplay');
const { createForecastPreviewArtifact, parseForecastPreviewArtifact } = require('./forecastPreviewArtifact');
let artifact;
beforeAll(() => { artifact = createForecastPreviewArtifact(replayForecastDataset(forecastResearchFixture()), { generatedAt: '2026-10-12T06:00:00Z', staleAfterSeconds: 3600 }); });
test('materializes both horizons with integrity and deterministic metadata', () => {
  const parsed = parseForecastPreviewArtifact(JSON.stringify(artifact), { now: new Date('2026-10-12T06:30:00Z') });
  expect(parsed.freshness).toBe('fresh');
  expect(parsed.payload.previews.map(item => item.horizon_sessions)).toEqual([1, 5]);
  expect(parsed.payload.previews.every(item => item.live === false && item.market_accuracy_verified === false)).toBe(true);
});
test('classifies age and rejects tampering or oversized input', () => {
  expect(parseForecastPreviewArtifact(JSON.stringify(artifact), { now: new Date('2026-10-12T08:00:01Z') }).freshness).toBe('stale');
  const tampered = structuredClone(artifact); tampered.payload.previews[0].probabilities[0].value = 1;
  expect(() => parseForecastPreviewArtifact(JSON.stringify(tampered))).toThrow('integrity');
  expect(() => parseForecastPreviewArtifact(' '.repeat(256 * 1024 + 1))).toThrow('256 KiB');
});
