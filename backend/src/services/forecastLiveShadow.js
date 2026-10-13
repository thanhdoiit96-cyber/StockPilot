'use strict';
const { artifactHash } = require('./forecastArtifact');
const { snapshotGenerationKey, verifySnapshot } = require('./forecastSnapshotStore');
const CLASSES = ['declining', 'balanced', 'advancing'];

function validateLiveShadowInput({ preview, currentData, baseline, license = 'personal_research_only' } = {}) {
  if (preview?.status !== 'live_preview' || preview.synthetic !== false || preview.live !== true || preview.research_only !== false || preview.market_accuracy_verified !== false
    || currentData?.status !== 'current_data_ready' || currentData.synthetic !== false || currentData.live !== true || currentData.provider !== preview.provider
    || ![1, 5].includes(preview.horizon_sessions) || !Array.isArray(preview.probabilities) || !Array.isArray(currentData.rows) || !currentData.rows.length) throw new Error('Invalid live shadow input');
  const values = Object.fromEntries(preview.probabilities.map(item => [item.class, item.value]));
  if (CLASSES.some(name => !Number.isFinite(values[name]) || values[name] < 0 || values[name] > 1) || Math.abs(CLASSES.reduce((sum, name) => sum + values[name], 0) - 1) > 1e-6) throw new Error('Invalid live shadow probabilities');
  const asOf = String(preview.as_of || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || !Number.isFinite(Date.parse(preview.fetched_at))) throw new Error('Invalid live shadow time');
  const evidenceRows = currentData.rows.map(row => ({ symbol: row.instrument?.symbol, observed_at: row.observed_at, close: row.quote?.close, provider: row.source?.provider || currentData.provider,
    dataset: row.source?.dataset || null, fetched_at: row.fetched_at || null })).sort((a, b) => String(a.symbol).localeCompare(String(b.symbol)) || String(a.observed_at).localeCompare(String(b.observed_at)));
  if (evidenceRows.some(row => !row.symbol || !row.observed_at || !Number.isFinite(Number(row.close)))) throw new Error('Invalid live shadow evidence');
  if (baseline && (baseline.version !== 'forecast_live_baseline_v1' || baseline.horizon_sessions !== preview.horizon_sessions || baseline.completed_outcomes < 20 || !/^[a-f0-9]{64}$/.test(baseline.training_hash || ''))) throw new Error('Invalid live shadow baseline');
  return { version: baseline ? 'forecast_live_shadow_payload_v2' : 'forecast_live_shadow_payload_v1', mode: 'local_live_preview', shadow: true, synthetic: false, research_only: false, live: true, market_accuracy_verified: false,
    provider: preview.provider, model_version: preview.model_version || 'forecast_current_softmax_prototype_v1', horizon_sessions: preview.horizon_sessions, as_of: asOf, target_session: null,
    issued_at: new Date(preview.fetched_at).toISOString(), probabilities: CLASSES.map(name => ({ class: name, value: values[name] })),
    provenance: { license, license_status: 'pending_validation', evidence_sha256: artifactHash(evidenceRows), observations: evidenceRows.length,
      symbols: [...new Set(evidenceRows.map(row => row.symbol))].sort(), oldest_observed_at: evidenceRows.reduce((oldest, row) => row.observed_at < oldest ? row.observed_at : oldest, evidenceRows[0].observed_at),
      newest_observed_at: evidenceRows.reduce((latest, row) => row.observed_at > latest ? row.observed_at : latest, evidenceRows[0].observed_at), feature_policy: 'per_symbol_returns_1_5_20_then_basket_mean_v1' }, ...(baseline ? { baseline_snapshot: baseline } : {}),
    outcome_policy: { version: 'nth_distinct_provider_session_after_as_of_v1', horizon_sessions: preview.horizon_sessions, status: 'pending' } };
}

async function createLiveShadowSnapshot({ models, preview, currentData, baseline, license, retentionDays = 180, now = new Date(), env = process.env } = {}) {
  if (env.NODE_ENV !== 'development' || env.FORECAST_LIVE_PREVIEW !== 'true') throw new Error('Live shadow materialization is development-only');
  if (!Number.isInteger(retentionDays) || retentionDays < 30 || retentionDays > 730) throw new Error('Invalid retention policy');
  const payload = validateLiveShadowInput({ preview, currentData, baseline, license }), generation_key = snapshotGenerationKey(payload), payload_sha256 = artifactHash(payload);
  const existing = await models.ForecastSnapshot.findOne({ where: { generation_key } });
  if (existing) {
    const row = existing.get ? existing.get({ plain: true }) : existing;
    if (!verifySnapshot(row)) throw new Error('Live shadow identity conflict');
    return { status: 'snapshot_exists', snapshot: row };
  }
  const values = { generation_key, schema_version: payload.version, provider: payload.provider, model_version: payload.model_version, horizon_sessions: payload.horizon_sessions,
    as_of: payload.as_of, target_session: null, synthetic: false, research_only: false, payload, payload_sha256, expires_at: new Date(now.getTime() + retentionDays * 86400000) };
  try {
    const created = await models.sequelize.transaction(transaction => models.ForecastSnapshot.create(values, { transaction }));
    return { status: 'created', snapshot: created.get ? created.get({ plain: true }) : created };
  } catch (error) {
    if (error?.name !== 'SequelizeUniqueConstraintError') throw error;
    const raced = await models.ForecastSnapshot.findOne({ where: { generation_key } }), row = raced?.get ? raced.get({ plain: true }) : raced;
    if (!row || !verifySnapshot(row)) throw new Error('Live shadow identity conflict');
    return { status: 'snapshot_exists', snapshot: row };
  }
}
module.exports = { validateLiveShadowInput, createLiveShadowSnapshot };
