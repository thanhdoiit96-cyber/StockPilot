const { artifactHash, runForecastArtifact, readForecastArtifact } = require('./forecastArtifact');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { forecastResearchFixture } = require('./forecastResearchFixture');
function artifact() {
  const f = forecastResearchFixture();
  const rows = f.rows.map((r, i) => ({ ...r, id: String(i), observed_at: r.session + 'T00:00:00Z', source_hash: 'hash-' + i }));
  const payload = { ...f, rows, origins: f.origins.slice(0, 1), calendarKey: 'market', evidenceBundle: { version: 'forecast_evidence_bundle_v1', synthetic: true, revisions: [
    { id: 'calendar', kind: 'calendar', key: 'market', revision: 1, status: 'verified', recorded_at: '2024-12-01T00:00:00Z', payload: f.calendar },
    ...rows.map(r => ({ id: 'e' + r.id, kind: 'price', key: r.id, revision: 1, status: 'verified', recorded_at: r.available_at, payload: { ...r, source: 'fixture', verified_at: r.available_at } }))
  ] } };
  return { version: 'forecast_research_artifact_v1', payload, sha256: artifactHash(payload) };
}
test('verified artifact drives evidence replay and preserves synthetic provenance', () => {
  const a = artifact(); const report = runForecastArtifact(JSON.stringify(a));
  expect(report.artifact_sha256).toBe(a.sha256);
  expect(report.synthetic).toBe(true);
  expect(report.samples[0].labels[1].status).toBe('available');
});
test('tampering is rejected before replay', () => {
  const a = artifact(); a.payload.rows[0].close++;
  expect(() => runForecastArtifact(JSON.stringify(a))).toThrow('hash mismatch');
});
test('checksum does not bypass schema and context validation', () => {
  const a = artifact(); a.payload.evidenceBundle.synthetic = false; a.sha256 = artifactHash(a.payload);
  expect(() => runForecastArtifact(JSON.stringify(a))).toThrow('context');
});
test('hash is stable across object key order', () => {
  expect(artifactHash({ a: 1, b: [2, 3] })).toBe(artifactHash({ b: [2, 3], a: 1 }));
});

test('file import validates the same artifact without modifying it', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'forecast-artifact-'));
  const file = path.join(directory, 'fixture.json');
  const content = JSON.stringify(artifact());
  try {
    fs.writeFileSync(file, content);
    expect(readForecastArtifact(file).samples[0].members).toHaveLength(50);
    expect(fs.readFileSync(file, 'utf8')).toBe(content);
  } finally { fs.unlinkSync(file); fs.rmdirSync(directory); }
});
