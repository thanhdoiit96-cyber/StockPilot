'use strict';
const assert = require('assert/strict');
const { sequelize, ForecastSnapshot, ForecastOutcomeEvent } = require('../src/models');
const { artifactHash } = require('../src/services/forecastArtifact');
const { validateSnapshot, snapshotGenerationKey, validateOutcome } = require('../src/services/forecastSnapshotStore');

(async () => {
  const transaction = await sequelize.transaction();
  try {
    const payload = validateSnapshot({ synthetic: true, research_only: true, live: false, market_accuracy_verified: false, provider: 'fixture-verifier', model_version: 'softmax-v1',
      horizon_sessions: 5, as_of: '2025-03-18', target_session: '2025-03-23', split_hash: 'a'.repeat(64), training_hash: 'b'.repeat(64),
      probabilities: [{ class: 'advancing', value: .6 }, { class: 'balanced', value: .3 }, { class: 'declining', value: .1 }] });
    const snapshot = await ForecastSnapshot.create({ generation_key: snapshotGenerationKey(payload), schema_version: payload.version, provider: payload.provider, model_version: payload.model_version,
      horizon_sessions: payload.horizon_sessions, as_of: payload.as_of, target_session: payload.target_session, synthetic: true, research_only: true, payload,
      payload_sha256: artifactHash(payload), expires_at: new Date('2027-01-01T00:00:00Z') }, { transaction });
    const outcomePayload = validateOutcome(snapshot, { actual_class: 'balanced', target_session: payload.target_session, outcome_available_at: '2025-03-23T19:00:00+07:00' });
    await ForecastOutcomeEvent.create({ snapshot_id: snapshot.id, schema_version: outcomePayload.version, payload: outcomePayload, payload_sha256: artifactHash(outcomePayload) }, { transaction });
    assert.equal(await ForecastOutcomeEvent.count({ where: { snapshot_id: snapshot.id }, transaction }), 1);
    let immutable = false;
    try { await snapshot.update({ provider: 'tampered' }, { transaction }); } catch (error) { immutable = /immutable/.test(error.message); }
    assert.equal(immutable, true, 'Database trigger must reject snapshot update');
    console.log(JSON.stringify({ valid: true, snapshot_id: snapshot.id, outcome: 'measured', immutable: true, retained: false }));
  } finally {
    await transaction.rollback();
    await sequelize.close();
  }
})().catch(error => { console.error('Forecast snapshot store verification failed:', error.message); process.exitCode = 2; });
