'use strict';
const fs = require('fs');
const { createHash } = require('crypto');
const { createForecastEvidenceStore } = require('./forecastEvidenceStore');
const { replayForecastDataset } = require('./forecastReplay');
const canonical = value => Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']' : value && typeof value === 'object' ? '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}' : JSON.stringify(value);
const artifactHash = payload => createHash('sha256').update(canonical(payload)).digest('hex');
function parseForecastArtifact(text) {
  if (Buffer.byteLength(text, 'utf8') > 16 * 1024 * 1024) throw new Error('Artifact exceeds 16 MiB');
  const artifact = JSON.parse(text);
  if (artifact?.version !== 'forecast_research_artifact_v1' || !artifact.payload || !/^[a-f0-9]{64}$/.test(artifact.sha256)) throw new Error('Invalid artifact envelope');
  const p = artifact.payload;
  if (artifactHash(p) !== artifact.sha256) throw new Error('Artifact hash mismatch');
  if (typeof p.synthetic !== 'boolean' || typeof p.provider !== 'string' || !p.provider || typeof p.calendarKey !== 'string' || !p.calendarKey || !p.evidenceBundle || p.evidenceBundle.synthetic !== p.synthetic) throw new Error('Invalid artifact context');
  for (const [key, limit] of [['rows', 100000], ['origins', 500], ['evaluationCutoffs', 1000], ['folds', 100]]) {
    if (!Array.isArray(p[key]) || !p[key].length || p[key].length > limit) throw new Error('Invalid artifact collection: ' + key);
  }
  const ids = new Set();
  for (const row of p.rows) {
    if (!row || typeof row.id !== 'string' || !row.id || ids.has(row.id) || typeof row.stock_id !== 'string' || !row.stock_id || row.provider !== p.provider || row.interval !== '1d') throw new Error('Invalid artifact row');
    ids.add(row.id);
  }
  if (!Array.isArray(p.evidenceBundle.revisions) || p.evidenceBundle.revisions.length > 100000) throw new Error('Invalid revision collection');
  const store = createForecastEvidenceStore(p.evidenceBundle);
  return { hash: artifact.sha256, input: { ...p, evidenceStore: store } };
}
function runForecastArtifact(text) {
  const artifact = parseForecastArtifact(text);
  return { ...replayForecastDataset(artifact.input), artifact_sha256: artifact.hash,
    integrity_scope: 'Payload checksum only; not authentication of supplied evidence' };
}
function readForecastArtifact(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.size > 16 * 1024 * 1024) throw new Error('Artifact must be a regular file <=16 MiB');
    const buffer = Buffer.alloc(stat.size + 1);
    let length = 0, count;
    while (length < buffer.length && (count = fs.readSync(fd, buffer, length, buffer.length - length, null)) > 0) length += count;
    if (length > stat.size) throw new Error('Artifact changed during read');
    return runForecastArtifact(buffer.subarray(0, length).toString('utf8'));
  } finally { fs.closeSync(fd); }
}
module.exports = { artifactHash, parseForecastArtifact, runForecastArtifact, readForecastArtifact };
