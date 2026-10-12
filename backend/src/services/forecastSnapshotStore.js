'use strict';
const { createHash } = require('crypto');
const { Op } = require('sequelize');
const { artifactHash } = require('./forecastArtifact');
const CLASSES = ['declining', 'balanced', 'advancing'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const keyHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const plain = value => value?.get ? value.get({ plain: true }) : value;
const validDate = value => DATE.test(value || '') && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

function validateSnapshot(input) {
  if (!input || input.synthetic !== true || input.research_only !== true || input.live !== false || input.market_accuracy_verified !== false) throw new Error('Explicit synthetic research snapshot required');
  if (![1, 5].includes(input.horizon_sessions) || !validDate(input.as_of) || !input.provider || !input.model_version) throw new Error('Invalid snapshot identity');
  if (!/^[a-f0-9]{64}$/.test(input.split_hash || '') || !/^[a-f0-9]{64}$/.test(input.training_hash || '')) throw new Error('Invalid snapshot provenance');
  if (!Array.isArray(input.probabilities) || input.probabilities.length !== 3) throw new Error('Invalid snapshot probabilities');
  const values = Object.fromEntries(input.probabilities.map(item => [item.class, item.value]));
  if (CLASSES.some(name => !Number.isFinite(values[name]) || values[name] < 0 || values[name] > 1) || Math.abs(CLASSES.reduce((sum, name) => sum + values[name], 0) - 1) > 1e-9) throw new Error('Invalid snapshot probabilities');
  let baseline_snapshot;
  if (input.baseline_snapshot) {
    const baseline = input.baseline_snapshot;
    const normalize = probabilities => {
      if (!Array.isArray(probabilities) || probabilities.length !== 3) throw new Error('Invalid snapshot baseline');
      const mapped = Object.fromEntries(probabilities.map(item => [item.class, item.value]));
      if (CLASSES.some(name => !Number.isFinite(mapped[name]) || mapped[name] < 0 || mapped[name] > 1) || Math.abs(CLASSES.reduce((sum, name) => sum + mapped[name], 0) - 1) > 1e-9) throw new Error('Invalid snapshot baseline');
      return CLASSES.map(name => ({ class: name, value: mapped[name] }));
    };
    if (typeof baseline.version !== 'string' || !baseline.version || typeof baseline.persistence_version !== 'string' || !baseline.persistence_version || typeof baseline.fit_cutoff !== 'string' || !Number.isFinite(Date.parse(baseline.fit_cutoff)) || Date.parse(baseline.fit_cutoff) > Date.parse(`${input.as_of}T23:59:59.999+07:00`)) throw new Error('Invalid snapshot baseline');
    baseline_snapshot = { version: baseline.version, fit_cutoff: new Date(baseline.fit_cutoff).toISOString(), frequency_probabilities: normalize(baseline.frequency_probabilities),
      persistence_version: baseline.persistence_version, persistence_probabilities: normalize(baseline.persistence_probabilities) };
  }
  return { version: baseline_snapshot ? 'forecast_snapshot_payload_v2' : 'forecast_snapshot_payload_v1', synthetic: true, research_only: true, live: false, market_accuracy_verified: false,
    provider: input.provider, model_version: input.model_version, horizon_sessions: input.horizon_sessions, as_of: input.as_of,
    target_session: validDate(input.target_session) && input.target_session > input.as_of ? input.target_session : null, split_hash: input.split_hash, training_hash: input.training_hash,
    probabilities: CLASSES.map(name => ({ class: name, value: values[name] })), ...(baseline_snapshot ? { baseline_snapshot } : {}) };
}
function snapshotGenerationKey(payload) { return keyHash([payload.provider, payload.model_version, payload.horizon_sessions, payload.as_of]); }
function verifySnapshot(row) { const value = plain(row); return Boolean(value?.payload_sha256 && value.payload_sha256 === artifactHash(value.payload)); }

function validateOutcome(snapshot, input) {
  const row = plain(snapshot);
  if (!verifySnapshot(row)) throw new Error('Snapshot integrity failed');
  const availableAt = typeof input?.outcome_available_at === 'string' ? Date.parse(input.outcome_available_at) : NaN;
  if (!input || !CLASSES.includes(input.actual_class) || !validDate(input.target_session) || input.target_session !== row.target_session || !Number.isFinite(availableAt)
    || availableAt < Date.parse(`${input.target_session}T15:00:00+07:00`)) throw new Error('Invalid forecast outcome');
  const probabilities = Object.fromEntries(row.payload.probabilities.map(item => [item.class, item.value]));
  const truth = CLASSES.indexOf(input.actual_class);
  const vector = CLASSES.map(name => probabilities[name]);
  return { version: 'forecast_outcome_payload_v1', snapshot_sha256: row.payload_sha256, actual_class: input.actual_class, target_session: input.target_session,
    outcome_available_at: new Date(input.outcome_available_at).toISOString(), brier_multiclass_sum: vector.reduce((sum, value, index) => sum + (value - Number(index === truth)) ** 2, 0),
    log_loss: -Math.log(Math.max(1e-15, vector[truth])) };
}

async function createForecastSnapshot({ ForecastSnapshot, sequelize }, input, { retentionDays = 180, now = new Date() } = {}) {
  if (!Number.isInteger(retentionDays) || retentionDays < 30 || retentionDays > 730 || !Number.isFinite(now.getTime())) throw new Error('Invalid retention policy');
  const payload = validateSnapshot(input), generation_key = snapshotGenerationKey(payload), payload_sha256 = artifactHash(payload);
  const existing = await ForecastSnapshot.findOne({ where: { generation_key } });
  if (existing) {
    const row = plain(existing);
    if (!verifySnapshot(row)) throw new Error('Snapshot identity conflict');
    if (row.payload_sha256 !== payload_sha256) {
      if (row.payload?.version === 'forecast_snapshot_payload_v1' && payload.version === 'forecast_snapshot_payload_v2') return { status: 'snapshot_legacy_exists', snapshot: row };
      throw new Error('Snapshot identity conflict');
    }
    return { status: 'snapshot_exists', snapshot: plain(existing) };
  }
  const values = { generation_key, schema_version: payload.version, provider: payload.provider, model_version: payload.model_version, horizon_sessions: payload.horizon_sessions,
    as_of: payload.as_of, target_session: payload.target_session, synthetic: true, research_only: true, payload, payload_sha256,
    expires_at: new Date(now.getTime() + retentionDays * 86400000) };
  try {
    const created = await sequelize.transaction(transaction => ForecastSnapshot.create(values, { transaction }));
    return { status: 'created', snapshot: plain(created) };
  } catch (error) {
    if (error?.name !== 'SequelizeUniqueConstraintError') throw error;
    const raced = await ForecastSnapshot.findOne({ where: { generation_key } });
    const row = plain(raced);
    if (!row || !verifySnapshot(row)) throw new Error('Snapshot identity conflict');
    if (row.payload_sha256 !== payload_sha256) {
      if (row.payload?.version === 'forecast_snapshot_payload_v1' && payload.version === 'forecast_snapshot_payload_v2') return { status: 'snapshot_legacy_exists', snapshot: row };
      throw new Error('Snapshot identity conflict');
    }
    return { status: 'snapshot_exists', snapshot: row };
  }
}

async function recordForecastOutcome({ ForecastSnapshot, ForecastOutcomeEvent, sequelize }, snapshotId, input) {
  if (!UUID.test(snapshotId || '')) throw new Error('Invalid snapshot id');
  const snapshot = await ForecastSnapshot.findByPk(snapshotId);
  if (!snapshot) return { status: 'snapshot_not_found' };
  const payload = validateOutcome(snapshot, input), payload_sha256 = artifactHash(payload);
  const existing = await ForecastOutcomeEvent.findOne({ where: { snapshot_id: snapshotId } });
  if (existing) {
    const row = plain(existing);
    if (row.payload_sha256 !== payload_sha256 || row.payload_sha256 !== artifactHash(row.payload)) throw new Error('Outcome already measured with different evidence');
    return { status: 'outcome_exists', outcome: row };
  }
  try {
    const created = await sequelize.transaction(transaction => ForecastOutcomeEvent.create({ snapshot_id: snapshotId, schema_version: payload.version, payload, payload_sha256 }, { transaction }));
    return { status: 'measured', outcome: plain(created) };
  } catch (error) {
    if (error?.name !== 'SequelizeUniqueConstraintError') throw error;
    const raced = await ForecastOutcomeEvent.findOne({ where: { snapshot_id: snapshotId } });
    const row = plain(raced);
    if (!row || row.payload_sha256 !== payload_sha256 || row.payload_sha256 !== artifactHash(row.payload)) throw new Error('Outcome already measured with different evidence');
    return { status: 'outcome_exists', outcome: row };
  }
}

function writeForecastCursor(row) { return Buffer.from(JSON.stringify({ as_of: row.as_of, id: row.id })).toString('base64url'); }
function readForecastCursor(value) {
  if (typeof value !== 'string' || !value || value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid forecast cursor');
  let cursor; try { cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')); } catch { throw new Error('Invalid forecast cursor'); }
  if (!validDate(cursor?.as_of) || !UUID.test(cursor?.id || '')) throw new Error('Invalid forecast cursor');
  return cursor;
}
async function listForecastSnapshots({ ForecastSnapshot, ForecastOutcomeEvent }, { horizon, cursor, limit = 20, includeExpired = false, now = new Date() } = {}) {
  if (![1, 5].includes(horizon) || !Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error('Invalid forecast history query');
  const after = cursor ? readForecastCursor(cursor) : null;
  const where = { horizon_sessions: horizon, synthetic: true, research_only: true, ...(includeExpired ? {} : { expires_at: { [Op.gt]: now } }),
    ...(after ? { [Op.or]: [{ as_of: { [Op.lt]: after.as_of } }, { as_of: after.as_of, id: { [Op.lt]: after.id } }] } : {}) };
  const rows = await ForecastSnapshot.findAll({ where, include: [{ model: ForecastOutcomeEvent, as: 'outcome', required: false }], order: [['as_of', 'DESC'], ['id', 'DESC']], limit: limit + 1 });
  const page = rows.slice(0, limit).map(item => { const row = plain(item); return { ...row, lifecycle_status: row.outcome ? 'measured' : 'pending', integrity_valid: verifySnapshot(row) }; });
  return { items: page, has_more: rows.length > limit, next_cursor: rows.length > limit ? writeForecastCursor(page.at(-1)) : null };
}
async function listForecastCohortRows({ ForecastSnapshot, ForecastOutcomeEvent }, { horizon, modelVersion, dateFrom, dateTo, includeExpired = false, now = new Date(), maximumRows = 5000 } = {}) {
  if ((horizon !== undefined && ![1, 5].includes(horizon)) || (modelVersion !== undefined && (typeof modelVersion !== 'string' || !modelVersion || modelVersion.length > 120))
    || (dateFrom !== undefined && !validDate(dateFrom)) || (dateTo !== undefined && !validDate(dateTo)) || (dateFrom && dateTo && dateFrom > dateTo)
    || !Number.isInteger(maximumRows) || maximumRows < 1 || maximumRows > 10000) throw new Error('Invalid forecast cohort query');
  const asOf = { ...(dateFrom ? { [Op.gte]: dateFrom } : {}), ...(dateTo ? { [Op.lte]: dateTo } : {}) };
  const where = { synthetic: true, research_only: true, ...(horizon ? { horizon_sessions: horizon } : {}), ...(modelVersion ? { model_version: modelVersion } : {}),
    ...(Object.keys(asOf).length ? { as_of: asOf } : {}), ...(includeExpired ? {} : { expires_at: { [Op.gt]: now } }) };
  const rows = await ForecastSnapshot.findAll({ where, include: [{ model: ForecastOutcomeEvent, as: 'outcome', required: false }], order: [['as_of', 'ASC'], ['id', 'ASC']], limit: maximumRows + 1 });
  if (rows.length > maximumRows) throw new Error('Forecast cohort row limit exceeded');
  return rows.map(item => { const row = plain(item); return { ...row, integrity_valid: verifySnapshot(row) }; });
}

function buildForecastCohortSummary(rows, { minimumSamples = 20 } = {}) {
  if (!Array.isArray(rows) || !Number.isInteger(minimumSamples) || minimumSamples < 2 || minimumSamples > 1000) throw new Error('Invalid forecast cohort summary');
  const groups = new Map();
  const add = (key, dimensions, row) => {
    if (!groups.has(key)) groups.set(key, { dimensions, rows: [] });
    groups.get(key).rows.push(row);
  };
  for (const row of rows) {
    if (!row.integrity_valid || !verifySnapshot(row)) throw new Error('Forecast snapshot integrity failed');
    if (row.outcome) {
      const outcome = plain(row.outcome);
      if (!outcome.payload_sha256 || outcome.payload_sha256 !== artifactHash(outcome.payload) || outcome.payload?.snapshot_sha256 !== row.payload_sha256) throw new Error('Forecast outcome integrity failed');
    }
    const dimensions = { provider: row.provider, model_version: row.model_version, horizon_sessions: row.horizon_sessions };
    add(`cohort:${row.provider}:${row.model_version}:${row.horizon_sessions}`, dimensions, row);
    const month = String(row.as_of).slice(0, 7);
    add(`month:${row.provider}:${row.model_version}:${row.horizon_sessions}:${month}`, { ...dimensions, month }, row);
  }
  const summarize = ({ dimensions, rows: cohortRows }) => {
    const measured = cohortRows.filter(row => row.outcome);
    const v1 = cohortRows.filter(row => row.payload.version === 'forecast_snapshot_payload_v1');
    const v2 = cohortRows.filter(row => row.payload.version === 'forecast_snapshot_payload_v2');
    const measuredV2 = v2.filter(row => row.outcome);
    const score = (row, probabilities) => {
      const actual = row.outcome.payload.actual_class, truth = CLASSES.indexOf(actual);
      return { brier: probabilities.reduce((sum, item, index) => sum + (item.value - Number(index === truth)) ** 2, 0), log: -Math.log(Math.max(1e-15, probabilities[truth].value)) };
    };
    const average = (values, key) => values.length ? values.reduce((sum, value) => sum + value[key], 0) / values.length : null;
    const modelScores = measuredV2.map(row => score(row, row.payload.probabilities));
    const frequencyScores = measuredV2.map(row => score(row, row.payload.baseline_snapshot.frequency_probabilities));
    const persistenceScores = measuredV2.map(row => score(row, row.payload.baseline_snapshot.persistence_probabilities));
    const eligible = measuredV2.length >= minimumSamples;
    const comparison = eligible ? { status: 'available', convention: 'model_minus_baseline; negative_favors_model', samples: measuredV2.length,
      model: { brier_multiclass_sum: average(modelScores, 'brier'), log_loss: average(modelScores, 'log') },
      frequency: { brier_multiclass_sum: average(frequencyScores, 'brier'), log_loss: average(frequencyScores, 'log'), brier_delta: average(modelScores, 'brier') - average(frequencyScores, 'brier'), log_loss_delta: average(modelScores, 'log') - average(frequencyScores, 'log') },
      persistence: { brier_multiclass_sum: average(persistenceScores, 'brier'), log_loss: average(persistenceScores, 'log'), brier_delta: average(modelScores, 'brier') - average(persistenceScores, 'brier'), log_loss_delta: average(modelScores, 'log') - average(persistenceScores, 'log') } }
      : { status: 'insufficient_samples', reason: 'minimum_v2_measured_samples_not_met', samples: measuredV2.length, minimum_samples: minimumSamples };
    return { dimensions, date_range: { from: cohortRows[0]?.as_of || null, to: cohortRows.at(-1)?.as_of || null }, predictions: cohortRows.length, measured: measured.length,
      pending: cohortRows.length - measured.length, coverage: { v1: { predictions: v1.length, measured: v1.filter(row => row.outcome).length }, v2: { predictions: v2.length, measured: measuredV2.length }, baseline_eligible_measured: measuredV2.length }, baseline_comparison: comparison };
  };
  const values = [...groups.entries()];
  return { version: 'forecast_cohort_summary_v1', source: 'snapshot_store', synthetic: true, research_only: true, live: false, market_accuracy_verified: false,
    minimum_samples: minimumSamples, total_rows: rows.length, cohorts: values.filter(([key]) => key.startsWith('cohort:')).map(([, value]) => summarize(value)),
    monthly_cohorts: values.filter(([key]) => key.startsWith('month:')).map(([, value]) => summarize(value)) };
}
function buildStoredForecastHistory(page, horizon, minimumBinSamples = 5) {
  if (![1, 5].includes(horizon) || !Array.isArray(page?.items) || !Number.isInteger(minimumBinSamples) || minimumBinSamples < 2) throw new Error('Invalid stored forecast history');
  const entries = page.items.map(row => {
    if (!row.integrity_valid || row.payload?.horizon_sessions !== horizon) throw new Error('Forecast snapshot integrity failed');
    const probabilities = row.payload.probabilities;
    const ranked = [...probabilities].sort((a, b) => b.value - a.value || a.class.localeCompare(b.class));
    const base = { id: row.id, as_of: row.as_of, target_session: row.target_session, horizon_sessions: horizon, provider: row.provider, model_version: row.model_version,
      predicted_class: ranked[0].class, confidence: ranked[0].value, probabilities };
    if (!row.outcome) return { ...base, outcome_status: 'pending' };
    const outcome = plain(row.outcome);
    if (!outcome.payload_sha256 || outcome.payload_sha256 !== artifactHash(outcome.payload) || outcome.payload?.snapshot_sha256 !== row.payload_sha256) throw new Error('Forecast outcome integrity failed');
    const actual = outcome.payload.actual_class, truth = CLASSES.indexOf(actual);
    const baseline = row.payload.baseline_snapshot;
    const baselineScore = probabilities => probabilities ? { brier_multiclass_sum: probabilities.reduce((sum, item, index) => sum + (item.value - Number(index === truth)) ** 2, 0),
      log_loss: -Math.log(Math.max(1e-15, probabilities[truth].value)) } : null;
    return { ...base, outcome_status: 'measured', actual_class: actual, outcome_available_at: outcome.payload.outcome_available_at,
      correct: ranked[0].class === actual, brier_multiclass_sum: outcome.payload.brier_multiclass_sum, log_loss: outcome.payload.log_loss,
      baseline_scores: baseline ? { frequency: baselineScore(baseline.frequency_probabilities), persistence: baselineScore(baseline.persistence_probabilities) } : null };
  });
  const measured = entries.filter(entry => entry.outcome_status === 'measured');
  const mean = key => measured.length ? measured.reduce((sum, entry) => sum + entry[key], 0) / measured.length : null;
  const bins = [[0, .5], [.5, .7], [.7, .85], [.85, 1.0000000001]].map(([lower, upper], index) => {
    const rows = measured.filter(entry => entry.confidence >= lower && entry.confidence < upper);
    return { bin_index: index, confidence_lower: lower, confidence_upper: Math.min(1, upper), samples: rows.length,
      status: rows.length >= minimumBinSamples ? 'observed' : 'insufficient_samples', mean_confidence: rows.length ? rows.reduce((sum, row) => sum + row.confidence, 0) / rows.length : null,
      accuracy: rows.length ? rows.filter(row => row.correct).length / rows.length : null };
  });
  const withBaseline = measured.filter(entry => entry.baseline_scores);
  const baselineMean = (type, key) => withBaseline.length ? withBaseline.reduce((sum, entry) => sum + entry.baseline_scores[type][key], 0) / withBaseline.length : null;
  const modelBrier = mean('brier_multiclass_sum'), modelLogLoss = mean('log_loss'), baselineComplete = measured.length > 0 && withBaseline.length === measured.length;
  const baselineComparison = baselineComplete ? { status: 'available', convention: 'model_minus_baseline; negative_favors_model', frequency: {
    samples: withBaseline.length, brier_multiclass_sum: baselineMean('frequency', 'brier_multiclass_sum'), log_loss: baselineMean('frequency', 'log_loss'),
    brier_delta: modelBrier - baselineMean('frequency', 'brier_multiclass_sum'), log_loss_delta: modelLogLoss - baselineMean('frequency', 'log_loss') }, persistence: {
    samples: withBaseline.length, brier_multiclass_sum: baselineMean('persistence', 'brier_multiclass_sum'), log_loss: baselineMean('persistence', 'log_loss'),
    brier_delta: modelBrier - baselineMean('persistence', 'brier_multiclass_sum'), log_loss_delta: modelLogLoss - baselineMean('persistence', 'log_loss') } }
    : { status: 'unavailable', reason: measured.length ? 'baseline_not_stored_with_all_snapshots' : 'no_measured_outcomes' };
  return { version: 'forecast_history_repository_v1', status: 'research_history', source: 'snapshot_store', synthetic: true, research_only: true, live: false,
    market_accuracy_verified: false, calibrated: false, horizon_sessions: horizon, scoring: { convention: 'lower_is_better_for_brier_and_log_loss', baseline_status: baselineComparison.status },
    summary: { predictions: entries.length, measured: measured.length, pending: entries.length - measured.length, brier_multiclass_sum: modelBrier,
      log_loss: modelLogLoss, accuracy: measured.length ? measured.filter(entry => entry.correct).length / measured.length : null, baseline_comparison: baselineComparison },
    reliability: { minimum_bin_samples: minimumBinSamples, interpretation: 'diagnostic_only_not_calibration', bins }, entries,
    pagination: { has_more: page.has_more === true, next_cursor: page.next_cursor || null } };
}
module.exports = { validateSnapshot, snapshotGenerationKey, verifySnapshot, validateOutcome, createForecastSnapshot, recordForecastOutcome, writeForecastCursor, readForecastCursor, listForecastSnapshots, buildStoredForecastHistory, listForecastCohortRows, buildForecastCohortSummary };
