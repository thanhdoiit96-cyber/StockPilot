'use strict';
const fs = require('fs');
const { artifactHash } = require('./forecastArtifact');
const { buildForecastPresentation } = require('./forecastPresentation');
const VERSION = 'forecast_research_preview_artifact_v1';
const DEFAULT_STALE_SECONDS = 7 * 24 * 60 * 60;
const validTime = value => typeof value === 'string' && /T.*(Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));

function createForecastPreviewArtifact(report, { generatedAt = new Date().toISOString(), staleAfterSeconds = DEFAULT_STALE_SECONDS } = {}) {
  if (!validTime(generatedAt) || !Number.isInteger(staleAfterSeconds) || staleAfterSeconds < 60 || staleAfterSeconds > 31 * 24 * 60 * 60) throw new Error('Invalid preview artifact metadata');
  if (report?.synthetic !== true || report?.research_only !== true) throw new Error('Preview artifact requires synthetic research report');
  const previews = [1, 5].map(horizon => {
    const model = report.models?.find(item => item.horizon_sessions === horizon);
    const sessions = model?.folds.flatMap(fold => fold.predictions || []).map(item => item.session).sort() || [];
    const preview = buildForecastPresentation({ report, horizon, asOf: sessions.at(-1) });
    if (preview.status !== 'research_preview') throw new Error(`Preview unavailable for horizon ${horizon}`);
    return preview;
  });
  const payload = { generated_at: new Date(generatedAt).toISOString(), stale_after_seconds: staleAfterSeconds, synthetic: true, research_only: true,
    source: 'synthetic_fixture_replay', report_version: report.version, model_versions: [...new Set(report.models.map(item => item.version))],
    split_hashes: report.models.map(item => ({ horizon_sessions: item.horizon_sessions, split_hash: item.split_hash })), previews };
  return { version: VERSION, sha256: artifactHash(payload), payload };
}

function parseForecastPreviewArtifact(text, { now = new Date() } = {}) {
  if (Buffer.byteLength(text, 'utf8') > 256 * 1024) throw new Error('Preview artifact exceeds 256 KiB');
  const artifact = JSON.parse(text);
  if (artifact?.version !== VERSION || !artifact.payload || !/^[a-f0-9]{64}$/.test(artifact.sha256) || artifactHash(artifact.payload) !== artifact.sha256) throw new Error('Invalid preview artifact integrity');
  const p = artifact.payload;
  if (!validTime(p.generated_at) || !Number.isInteger(p.stale_after_seconds) || p.stale_after_seconds < 60 || p.synthetic !== true || p.research_only !== true || !Array.isArray(p.previews) || p.previews.length !== 2) throw new Error('Invalid preview artifact payload');
  const horizons = new Set();
  for (const preview of p.previews) {
    if (![1, 5].includes(preview?.horizon_sessions) || horizons.has(preview.horizon_sessions) || preview.status !== 'research_preview' || preview.synthetic !== true || preview.research_only !== true || preview.live !== false || preview.market_accuracy_verified !== false || !Array.isArray(preview.probabilities)) throw new Error('Invalid preview contract');
    horizons.add(preview.horizon_sessions);
    const values = preview.probabilities.map(item => item.value);
    if (values.length !== 3 || values.some(value => !Number.isFinite(value) || value < 0 || value > 1) || Math.abs(values.reduce((a, b) => a + b, 0) - 1) > 1e-9) throw new Error('Invalid preview probabilities');
  }
  const ageSeconds = Math.max(0, (new Date(now).getTime() - Date.parse(p.generated_at)) / 1000);
  return { ...artifact, freshness: ageSeconds > p.stale_after_seconds ? 'stale' : 'fresh', age_seconds: Math.floor(ageSeconds) };
}

function readForecastPreviewArtifact(file, options) {
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size > 256 * 1024) throw new Error('Preview artifact must be a regular file <=256 KiB');
  return parseForecastPreviewArtifact(fs.readFileSync(file, 'utf8'), options);
}
module.exports = { createForecastPreviewArtifact, parseForecastPreviewArtifact, readForecastPreviewArtifact, DEFAULT_STALE_SECONDS };
