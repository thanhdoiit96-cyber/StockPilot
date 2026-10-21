'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { buildShortTermRecommendations, evaluateRecommendations } = require('./recommendationEngine');

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function recommendationInputProvenanceHash(provenance) {
  return provenance && typeof provenance === 'object' ? crypto.createHash('sha256').update(canonicalJson(provenance)).digest('hex') : null;
}

function recommendationEvaluationEvent({ recommendation, run, now }) {
  const payload = { version: 'recommendation_evaluation_event_v1', recommendation_id: recommendation.id, run_id: run.id, outcome: recommendation.outcome, evaluated_at: recommendation.evaluated_at, forward_return_pct: recommendation.forward_return_pct, evaluation_evidence: recommendation.evaluation_evidence, recorded_at: new Date(now).toISOString() };
  return { recommendation_id: recommendation.id, run_id: run.id, event_type: 'evaluation_recorded', schema_version: 'recommendation_evaluation_event_v1', payload, payload_sha256: recommendationEvaluationEventHash(payload) };
}

function recommendationEvaluationEventHash(payload) {
  return payload && typeof payload === 'object' ? crypto.createHash('sha256').update(canonicalJson(payload)).digest('hex') : null;
}

function verifyRecommendationEvaluationEvent(event) {
  const expected = typeof event?.payload_sha256 === 'string' ? event.payload_sha256 : null;
  const actual = recommendationEvaluationEventHash(event?.payload);
  return { valid: Boolean(expected && actual && expected === actual), expected, actual, reason: expected && actual ? 'payload_sha256_mismatch' : 'payload_or_hash_missing' };
}

function recommendationSnapshotHash(run) {
  const snapshot = (run.recommendations || []).map(item => ({ rank: item.rank, stock_id: item.stock_id, code: item.stock?.code, entry_price: item.entry_price == null ? null : Number(item.entry_price), horizon_days: item.horizon_days, rationale: item.rationale })).sort((a, b) => a.rank - b.rank);
  return crypto.createHash('sha256').update(canonicalJson({ version: 'recommendation_snapshot_v2', run_id: run.id, as_of: run.as_of, model: run.model, provider: run.provider, input_provenance_sha256: run.input_provenance_sha256 || null, snapshot })).digest('hex');
}

function recommendationGenerationKey({ asOf, horizonDays, provider, model = 'short_term_rule_v2' }) {
  return crypto.createHash('sha256').update(JSON.stringify({ as_of: asOf, horizon_days: Number(horizonDays), provider, model })).digest('hex');
}

function verifyRecommendationSnapshot(run, evidencePath = process.env.RECOMMENDATION_MONITOR_EVIDENCE || path.resolve(__dirname, '../../evidence/recommendation-monitor-latest.json')) {
  if (process.env.RECOMMENDATION_SNAPSHOT_VERIFY === 'false') return { valid: true, skipped: true };
  const actual = recommendationSnapshotHash(run);
  if (run.snapshot_sha256) {
    const provenanceValid = Boolean(run.input_provenance_sha256 && run.input_provenance_sha256 === recommendationInputProvenanceHash(run.input_provenance));
    return { valid: run.snapshot_sha256 === actual && provenanceValid, expected: run.snapshot_sha256, actual, source: 'recommendation_runs.snapshot_sha256', reason: provenanceValid ? null : 'input_provenance_integrity_failed' };
  }
  if (!fs.existsSync(evidencePath)) return { valid: false, reason: 'snapshot_monitor_evidence_missing', evidencePath };
  try {
    const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    const expected = evidence.run?.id === run.id ? evidence.run.snapshot_sha256 : null;
    return { valid: Boolean(expected && expected === actual), expected, actual, evidencePath, source: 'legacy_monitor_evidence' };
  } catch (error) {
    return { valid: false, reason: 'snapshot_monitor_evidence_invalid', error: error.message, evidencePath };
  }
}

async function loadPriceRows({ StockPrice, transaction, provider = 'vnstock', interval = '1d' }) {
  const rows = await StockPrice.findAll({ where: { provider, interval }, order: [['observed_at', 'ASC'], ['id', 'ASC']], limit: 200000, transaction });
  const byStock = new Map();
  for (const row of rows) { if (!byStock.has(row.stock_id)) byStock.set(row.stock_id, []); byStock.get(row.stock_id).push(row.toJSON ? row.toJSON() : row); }
  return byStock;
}

async function loadVerifiedExternalFactors({ ExternalFactor, transaction } = {}) {
  if (!ExternalFactor?.findAll) return [];
  const rows = await ExternalFactor.findAll({ where: { status: 'verified' }, order: [['published_at', 'DESC'], ['id', 'DESC']], transaction });
  return rows.map(row => row.toJSON ? row.toJSON() : row).filter(item => item.source && item.published_at);
}

function groupExternalFactorsByStock(stocks, factors) {
  const byStock = new Map();
  for (const stock of stocks) {
    byStock.set(stock.code, factors.filter(item => !item.symbol || item.symbol === stock.code));
  }
  return byStock;
}

function holidaySet(value = process.env.VNSTOCK_HOLIDAYS || '') {
  return new Set(String(value).split(',').map(item => item.trim()).filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item)));
}

function eodCutoffHour(value = process.env.VNSTOCK_EOD_CUTOFF_HOUR) {
  const hour = Number(value);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 15;
}

function vietnamSessionDate(now = new Date(), holidays = holidaySet(), cutoffHour = eodCutoffHour()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const session = new Date(`${values.year}-${values.month}-${values.day}T00:00:00.000Z`);
  if (Number(values.hour) < cutoffHour) session.setUTCDate(session.getUTCDate() - 1);
  while ([0, 6].includes(session.getUTCDay()) || holidays.has(session.toISOString().slice(0, 10))) session.setUTCDate(session.getUTCDate() - 1);
  return session.toISOString().slice(0, 10);
}

function latestEodSession(rows = []) {
  return rows.reduce((latest, row) => {
    const value = row?.observed_at || row?.date;
    if (!value || Number.isNaN(Date.parse(value))) return latest;
    const date = new Date(value).toISOString().slice(0, 10);
    return !latest || date > latest ? date : latest;
  }, null);
}

function inputProvenance({ rows, factors, provider, session, now }) {
  const eligible = rows.filter(row => row.provider === provider && row.interval === '1d');
  return {
    version: 'recommendation_input_v1', read_at: new Date(now).toISOString(), transaction_isolation: 'REPEATABLE READ',
    eod_session: session, provider, reference_price_source: 'eod', price_rows: eligible.length,
    price_contracts: [...new Set(eligible.map(row => [row.provider, row.interval, row.currency, row.price_unit, row.is_adjusted].join('|')))].sort(),
    verified_external_factor_count: factors.length,
  };
}

async function generateRecommendationSnapshot({ Stock, StockPrice, ExternalFactor, RecommendationRun, Recommendation, sequelize, provider = 'vnstock', limit = 5, horizonDays = 20, useIntradayReference = false, now = new Date() } = {}) {
  if (useIntradayReference) console.warn('[Recommendation Persistence] Intraday references are ignored for immutable scheduled snapshots');
  let asOfDate;
  let generation_key;
  const seal = async transaction => {
  const stocks = await Stock.findAll({ where: { listing_status: 'listed' }, order: [['code', 'ASC']], transaction });
  const priceRowsByStock = await loadPriceRows({ StockPrice, transaction, provider });
  const priceRows = [...priceRowsByStock.values()].flat();
  const expectedSession = vietnamSessionDate(now);
  const latestSession = latestEodSession(priceRows);
  if (latestSession !== expectedSession) return { status: 'eod_not_ready', expected_session: expectedSession, latest_eod_session: latestSession, universe_size: stocks.length };
  const sessionPriceRowsByStock = new Map([...priceRowsByStock.entries()].map(([stockId, rows]) => [stockId, rows.filter(row => latestEodSession([row]) <= latestSession)]));
  const sessionPriceRows = [...sessionPriceRowsByStock.values()].flat();
  const stockData = stocks.map(item => item.toJSON());
  const externalFactors = await loadVerifiedExternalFactors({ ExternalFactor, transaction });
  const factorsByStock = groupExternalFactorsByStock(stockData, externalFactors);
  const recommendations = buildShortTermRecommendations({ stocks: stockData, priceRowsByStock: sessionPriceRowsByStock, externalFactorsByStock: factorsByStock, limit, horizonDays, asOf: new Date(`${latestSession}T00:00:00.000Z`) });
  asOfDate = latestSession; const model = 'short_term_rule_v2';
  generation_key = recommendationGenerationKey({ asOf: asOfDate, horizonDays, provider, model });
  const existing = await RecommendationRun.findOne({ where: { as_of: asOfDate, horizon_days: horizonDays, provider, model }, order: [['created_at', 'DESC']], transaction });
  if (existing) return { status: 'snapshot_exists', run_id: existing.id, as_of: asOfDate, universe_size: existing.universe_size, selected_count: existing.selected_count, model: existing.model, snapshot_sha256: existing.snapshot_sha256 || null };
  const run = await RecommendationRun.create({ as_of: asOfDate, horizon_days: horizonDays, provider, model, generation_key, input_provenance: inputProvenance({ rows: sessionPriceRows, factors: externalFactors, provider, session: asOfDate, now }), universe_size: stocks.length, selected_count: recommendations.length, status: 'completed' }, { transaction });
  const storedRecommendations = recommendations.map(item => ({ run_id: run.id, stock_id: item.stock_id, rank: item.rank, score: item.score, horizon_days: item.horizon_days, entry_price: item.entry_price, rationale: item.rationale, outcome: 'pending' }));
  if (storedRecommendations.length) await Recommendation.bulkCreate(storedRecommendations, { transaction });
  // Hash the persisted representation, including joined stock codes and JSONB
  // key ordering. Spreading a Sequelize instance loses its attribute getters.
  const persisted = await RecommendationRun.findOne({
    where: { id: run.id }, transaction,
    include: [{ association: 'recommendations', include: [{ association: 'stock', attributes: ['code'] }] }],
  });
  if (!persisted || persisted.recommendations?.length !== storedRecommendations.length) {
    throw new Error('Cannot seal incomplete recommendation snapshot');
  }
  const input_provenance_sha256 = recommendationInputProvenanceHash(persisted.input_provenance);
  if (!input_provenance_sha256) throw new Error('Cannot seal snapshot without input provenance');
  await RecommendationRun.update({ input_provenance_sha256 }, { where: { id: run.id }, transaction });
  const sealed = await RecommendationRun.findOne({ where: { id: run.id }, transaction, include: [{ association: 'recommendations', include: [{ association: 'stock', attributes: ['code'] }] }] });
  const snapshot_sha256 = recommendationSnapshotHash(sealed);
  await RecommendationRun.update({ snapshot_sha256 }, { where: { id: run.id }, transaction });
  return { run_id: run.id, universe_size: stocks.length, selected_count: recommendations.length, symbols: recommendations.map(item => item.symbol), model: 'short_term_rule_v2', snapshot_sha256 };
  };
  try { return sequelize?.transaction ? await sequelize.transaction({ isolationLevel: 'REPEATABLE READ' }, seal) : await seal(); }
  catch (error) {
    if (!['SequelizeUniqueConstraintError', '23505'].includes(error?.name) && error?.original?.code !== '23505') throw error;
    const raced = await RecommendationRun.findOne({ where: { generation_key }, order: [['created_at', 'DESC']] });
    if (!raced) throw error;
    return { status: 'snapshot_exists', run_id: raced.id, as_of: asOfDate, universe_size: raced.universe_size, selected_count: raced.selected_count, model: raced.model, snapshot_sha256: raced.snapshot_sha256 || null };
  }
}

async function evaluatePendingRecommendations({ StockPrice, RecommendationRun, Recommendation, RecommendationEvaluationEvent, sequelize, now = new Date() } = {}) {
  const runs = await RecommendationRun.findAll({ order: [['created_at', 'ASC']], include: [{ association: 'recommendations', include: [{ association: 'stock', attributes: ['code'] }] }] });
  const pendingRuns = runs.filter(run => (run.recommendations || []).some(item => !item.outcome || item.outcome === 'pending'));
  if (!pendingRuns.length) return { status: 'no_pending_recommendations', evaluated: 0, measured: 0, runs_considered: 0, runs_skipped_integrity: 0 };
  const priceRowsByStock = await loadPriceRows({ StockPrice });
  const report = { status: 'completed', evaluated: 0, measured: 0, positive: 0, runs_considered: pendingRuns.length, runs_evaluated: 0, runs_skipped_integrity: 0, skipped: [] };
  for (const run of pendingRuns) {
    const integrity = verifyRecommendationSnapshot(run);
    if (!integrity.valid) { report.runs_skipped_integrity += 1; report.skipped.push({ run_id: run.id, reason: integrity.reason || 'snapshot_integrity_failed' }); continue; }
    const pending = run.recommendations.filter(item => !item.outcome || item.outcome === 'pending').map(item => item.toJSON ? item.toJSON() : item);
    const evaluated = evaluateRecommendations({ recommendations: pending, priceRowsByStock, asOf: run.as_of, provider: run.provider, evaluatedAt: now });
    report.runs_evaluated += 1;
    report.evaluated += evaluated.length;
    for (const item of evaluated) {
      if (item.outcome === 'pending') continue;
      if (!RecommendationEvaluationEvent?.create) throw new Error('RecommendationEvaluationEvent model is required to record evaluation');
      const write = async transaction => {
        const [affected = 0] = await Recommendation.update({ evaluated_at: item.evaluated_at, forward_return_pct: item.forward_return_pct, outcome: item.outcome, evaluation_evidence: item.evaluation_evidence }, { where: { id: item.id, outcome: 'pending' }, transaction });
        if (affected) await RecommendationEvaluationEvent.create(recommendationEvaluationEvent({ recommendation: item, run, now }), { transaction });
        return [affected];
      };
      const [affected = 0] = sequelize?.transaction ? await sequelize.transaction(write) : await write();
      if (affected) { report.measured += 1; if (item.outcome === 'positive') report.positive += 1; }
    }
  }
  report.hit_rate_pct = report.measured ? Number((report.positive / report.measured * 100).toFixed(2)) : null;
  return report;
}

async function evaluateLatestRecommendations(dependencies = {}) { return evaluatePendingRecommendations(dependencies); }

module.exports = { generateRecommendationSnapshot, evaluateLatestRecommendations, evaluatePendingRecommendations, recommendationSnapshotHash, recommendationInputProvenanceHash, recommendationEvaluationEvent, recommendationEvaluationEventHash, verifyRecommendationEvaluationEvent, verifyRecommendationSnapshot, recommendationGenerationKey, inputProvenance, vietnamSessionDate, latestEodSession, holidaySet, eodCutoffHour };




