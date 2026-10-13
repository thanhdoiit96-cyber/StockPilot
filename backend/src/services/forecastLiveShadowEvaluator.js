'use strict';
const { artifactHash } = require('./forecastArtifact');
const { verifySnapshot } = require('./forecastSnapshotStore');

const plain = value => value?.get ? value.get({ plain: true }) : value;

function evaluateLiveShadowEvidence(snapshotInput, rows = [], now = new Date()) {
  const snapshot = plain(snapshotInput);
  if (!snapshot || !verifySnapshot(snapshot) || snapshot.synthetic !== false || snapshot.research_only !== false || !['forecast_live_shadow_payload_v1','forecast_live_shadow_payload_v2'].includes(snapshot.payload?.version)) throw new Error('Invalid live shadow snapshot');
  const horizon = snapshot.horizon_sessions, symbols = snapshot.payload.provenance?.symbols || [];
  if (![1, 5].includes(horizon) || !symbols.length || !Number.isFinite(now.getTime())) throw new Error('Invalid live shadow policy');
  const normalized = rows.map(row => ({ symbol: String(row.instrument?.symbol || '').toUpperCase(), session: String(row.observed_at || '').slice(0, 10), close: Number(row.quote?.close),
    observed_at: row.observed_at, provider: row.source?.provider, dataset: row.source?.dataset, fetched_at: row.fetched_at })).filter(row => symbols.includes(row.symbol) && row.provider === snapshot.provider && /^\d{4}-\d{2}-\d{2}$/.test(row.session) && row.close > 0);
  const bySymbol = new Map(symbols.map(symbol => [symbol, new Map()]));
  normalized.forEach(row => bySymbol.get(row.symbol)?.set(row.session, row));
  const sharedSessions = [...new Set(normalized.map(row => row.session))].filter(session => symbols.every(symbol => bySymbol.get(symbol).has(session))).sort();
  const origin = snapshot.as_of, future = sharedSessions.filter(session => session > origin);
  if (!sharedSessions.includes(origin)) return { status: 'pending', reason: 'origin_evidence_missing', sessions_observed: future.length, sessions_required: horizon };
  if (future.length < horizon) return { status: 'pending', reason: 'target_session_not_observed', sessions_observed: future.length, sessions_required: horizon };
  const target = future[horizon - 1], evidence = [];
  let advancing = 0;
  for (const symbol of symbols) {
    const start = bySymbol.get(symbol).get(origin), end = bySymbol.get(symbol).get(target);
    evidence.push(start, end); if (end.close > start.close) advancing += 1;
  }
  const breadth = advancing / symbols.length, actualClass = breadth < .45 ? 'declining' : breadth > .55 ? 'advancing' : 'balanced';
  const payload = { version: 'forecast_live_outcome_payload_v1', snapshot_sha256: snapshot.payload_sha256, actual_class: actualClass, target_session: target,
    outcome_available_at: now.toISOString(), breadth, coverage: 1, symbols, sessions_observed: horizon, evidence_sha256: artifactHash(evidence) };
  return { status: 'ready', payload };
}

async function appendLiveShadowOutcome(models, snapshotInput, rows, { now = new Date() } = {}) {
  const snapshot = plain(snapshotInput), evaluation = evaluateLiveShadowEvidence(snapshot, rows, now);
  if (evaluation.status !== 'ready') return evaluation;
  const payload_sha256 = artifactHash(evaluation.payload), existing = await models.ForecastOutcomeEvent.findOne({ where: { snapshot_id: snapshot.id } });
  if (existing) {
    const row = plain(existing);
    if (row.payload_sha256 !== artifactHash(row.payload)) throw new Error('Live outcome integrity conflict');
    return { status: 'outcome_exists', outcome: row };
  }
  try {
    const created = await models.sequelize.transaction(transaction => models.ForecastOutcomeEvent.create({ snapshot_id: snapshot.id, schema_version: evaluation.payload.version, payload: evaluation.payload, payload_sha256 }, { transaction }));
    return { status: 'measured', outcome: plain(created) };
  } catch (error) {
    if (error?.name !== 'SequelizeUniqueConstraintError') throw error;
    const raced = await models.ForecastOutcomeEvent.findOne({ where: { snapshot_id: snapshot.id } }), row = plain(raced);
    if (!row || row.payload_sha256 !== artifactHash(row.payload)) throw new Error('Live outcome integrity conflict');
    return { status: 'outcome_exists', outcome: row };
  }
}

module.exports = { evaluateLiveShadowEvidence, appendLiveShadowOutcome };
