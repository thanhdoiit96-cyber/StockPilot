const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { artifactHash } = require('./forecastArtifact');
const { forecastResearchFixture } = require('./forecastResearchFixture');
const script = path.resolve(__dirname, '../../scripts/report-forecast-research.cjs');
function fixtureArtifact() {
  const f = forecastResearchFixture();
  const rows = f.rows.map((row, i) => ({ ...row, id: String(i), observed_at: row.session + 'T00:00:00Z', source_hash: 'hash-' + i }));
  // Two origins are enough for an end-to-end training/test split.
  const payload = { ...f, rows, origins: [f.origins[0], f.origins[11]], calendarKey: 'market', evidenceBundle: {
    version: 'forecast_evidence_bundle_v1', synthetic: true, revisions: [
      { id: 'calendar', kind: 'calendar', key: 'market', revision: 1, status: 'verified', recorded_at: '2024-12-01T00:00:00Z', payload: f.calendar },
      ...rows.map(row => ({ id: 'p' + row.id, kind: 'price', key: row.id, revision: 1, status: 'verified', recorded_at: row.available_at, payload: { ...row, source: 'fixture', verified_at: row.available_at } }))
    ]
  } };
  return { version: 'forecast_research_artifact_v1', payload, sha256: artifactHash(payload) };
}
function run(file) {
  const result = spawnSync(process.execPath, [script, '--input', file], { encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024 });
  if (result.error) throw result.error;
  return result;
}
test('CLI artifact replay is reproducible, retains provenance and rejects tampering', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forecast-cli-'));
  const file = path.join(dir, 'research.json');
  try {
    const artifact = fixtureArtifact(), content = JSON.stringify(artifact);
    fs.writeFileSync(file, content);
    const first = run(file), second = run(file);
    expect(first.status).toBe(0);
    expect(second.stdout).toBe(first.stdout);
    const report = JSON.parse(first.stdout);
    expect(report.artifact_sha256).toBe(artifact.sha256);
    expect(report.summary).toMatchObject({ scope: 'synthetic_research', sample_count: 2, market_accuracy_verified: false });
    expect(report.summary.horizons.map(h => h.scored_samples)).toEqual([1, 1]);
    expect(report.samples[0].evidence_manifest.revision_ids.length).toBeGreaterThan(0);
    expect(fs.readFileSync(file, 'utf8')).toBe(content);
    artifact.payload.rows[0].close = 999;
    fs.writeFileSync(file, JSON.stringify(artifact));
    const failed = run(file);
    expect(failed.status).toBe(2);
    expect(failed.stdout).toBe('');
    expect(failed.stderr).toContain('hash mismatch');
  } finally { fs.unlinkSync(file); fs.rmdirSync(dir); }
}, 30000);
test('valid artifact with revoked calendar reports exclusions, not success metrics', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forecast-cli-blocked-'));
  const file = path.join(dir, 'research.json');
  try {
    const artifact = fixtureArtifact();
    artifact.payload.evidenceBundle.revisions[0].status = 'revoked';
    artifact.sha256 = artifactHash(artifact.payload);
    fs.writeFileSync(file, JSON.stringify(artifact));
    const result = run(file);
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.summary.excluded_origin_count).toBe(2);
    expect(report.summary.origin_exclusion_reasons).toEqual({ calendar_unverified: 2 });
    expect(report.summary.horizons.every(h => h.status === 'unavailable' && h.scored_samples === 0)).toBe(true);
  } finally { fs.unlinkSync(file); fs.rmdirSync(dir); }
});
