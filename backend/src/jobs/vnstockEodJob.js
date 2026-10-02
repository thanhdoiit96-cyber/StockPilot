'use strict';

const cron = require('node-cron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { ingestVnstockEod, defaultWindow } = require('../market-data/vnstockEodIngestion');
const { eodCoverage } = require('../market-data/eodCoverage');
const models = require('../models');
const { generateRecommendationSnapshot } = require('../services/recommendationPersistence');

const runtimeStatus = {
  running: false,
  phase: 'idle',
  session_date: null,
  started_at: null,
  finished_at: null,
  last_error: null
};

async function latestPersistedSession(sequelize) {
  if (!sequelize?.query) return null;
  const [rows] = await sequelize.query("SELECT MAX((observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::text AS session_date FROM stock_prices WHERE provider = 'vnstock' AND interval = '1d' AND observed_at IS NOT NULL");
  return rows?.[0]?.session_date || null;
}

function holidaySet(value = process.env.VNSTOCK_HOLIDAYS || '') {
  return new Set(String(value).split(',').map(item => item.trim()).filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item)));
}

function completedSessionDate(checkedAt = new Date(), holidays = holidaySet()) {
  const target = new Date(checkedAt.getTime() + 7 * 60 * 60 * 1000);
  while ([0, 6].includes(target.getUTCDay()) || holidays.has(target.toISOString().slice(0, 10))) target.setUTCDate(target.getUTCDate() - 1);
  return target.toISOString().slice(0, 10);
}

async function prioritizeMissingSymbols(sequelize, sessionDate, symbols, limit) {
  if (!sequelize?.query || !symbols.length) return symbols.slice(0, limit);
  const [rows] = await sequelize.query(`
    SELECT s.code, COALESCE(previous.volume, 0)::numeric AS volume
    FROM stocks s
    LEFT JOIN LATERAL (
      SELECT p.volume FROM stock_prices p
      WHERE p.stock_id = s.id AND p.provider = 'vnstock' AND p.interval = '1d'
        AND (p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date < $2::date
      ORDER BY p.observed_at DESC LIMIT 1
    ) previous ON TRUE
    WHERE s.code = ANY($1::text[])
    ORDER BY volume DESC, s.code ASC
    LIMIT $3
  `, { bind: [symbols, sessionDate, limit] });
  return rows.map(row => row.code);
}

function startVnstockEodJob({ cacheService, logger = console, schedule = process.env.VNSTOCK_EOD_CRON || '30 15 * * 1-5', retrySchedule = process.env.VNSTOCK_EOD_GAP_RETRY_CRON || '*/15 16-19 * * 1-5' } = {}) {
  // Keep daily EOD ingestion on by default so a fresh deployment cannot silently
  // fall back to intraday-only charts. Set VNSTOCK_EOD_ENABLED=false to opt out.
  if (process.env.VNSTOCK_EOD_ENABLED === 'false') return null;
  let running = false;
  const buildOptions = sessionDate => ({
    ...models,
    cacheService,
    symbols: process.env.VNSTOCK_SYMBOLS?.split(',').map(s => s.trim().toUpperCase()).filter(Boolean),
    from: sessionDate,
    to: sessionDate,
    source: process.env.VNSTOCK_SOURCE || 'vci',
    marketBySymbol: JSON.parse(process.env.VNSTOCK_MARKETS || '{}'),
    env: { VNSTOCK_PROJECT_DIR: process.env.VNSTOCK_PROJECT_DIR || '.vnstock' }
  });
  const runOnce = async () => {
    if (running) { logger.info('[Vnstock EOD] Previous run still active; skipping overlap'); return; }
    running = true;
    runtimeStatus.running = true;
    runtimeStatus.phase = 'scheduled_ingest';
    runtimeStatus.started_at = new Date().toISOString();
    runtimeStatus.last_error = null;
    const checkedAt = new Date();
    const window = defaultWindow(checkedAt);
    // Run after the local market close and target the completed local session.
    // On Saturday/Sunday, roll back to Friday; exchange holidays remain
    // explicit coverage gaps instead of being guessed here.
    const sessionDate = completedSessionDate(checkedAt);
    const evidence = { checked_at: checkedAt.toISOString(), session_date: sessionDate };
    try {
      const options = { ...buildOptions(sessionDate), from: window.from };
      runtimeStatus.session_date = sessionDate;
      const report = await ingestVnstockEod(options);
      evidence.ingestion = report;
      evidence.before_retry = await eodCoverage(models.sequelize, sessionDate, options.symbols || null);
      const retryPasses = Math.max(0, Number(process.env.VNSTOCK_EOD_GAP_RETRIES || 2));
      evidence.retries = [];
      let missingSymbols = evidence.before_retry.missing_symbols;
      for (let pass = 1; pass <= retryPasses && missingSymbols.length; pass += 1) {
        const retry = await ingestVnstockEod({ ...options, symbols: missingSymbols, from: sessionDate, to: sessionDate });
        const coverage = await eodCoverage(models.sequelize, sessionDate, missingSymbols);
        evidence.retries.push({ pass, requested: missingSymbols.length, ingestion: retry, remaining: coverage.missing_symbols.length });
        missingSymbols = coverage.missing_symbols;
      }
      // A later run can have no rows yet (weekend, holiday, or a provider
      // outage). Repair the latest persisted session so old gaps do not wait
      // forever for a user to report a stale symbol.
      if (process.env.VNSTOCK_EOD_REPAIR_PREVIOUS !== 'false') {
        const previousSession = await latestPersistedSession(models.sequelize);
        if (previousSession && previousSession !== sessionDate) {
          const previousCoverage = await eodCoverage(models.sequelize, previousSession, options.symbols || null);
          if (previousCoverage.missing_symbols.length) {
            const repair = await ingestVnstockEod({ ...options, symbols: previousCoverage.missing_symbols, from: previousSession, to: previousSession });
            evidence.previous_session_repair = { session_date: previousSession, requested: previousCoverage.missing_symbols.length, ingestion: repair };
          }
        }
      }
      logger.info(`[Vnstock EOD] ${JSON.stringify(report)}`);
      if (process.env.RECOMMENDATIONS_AFTER_INGEST === 'true') {
        const snapshot = await generateRecommendationSnapshot({ ...models, provider: process.env.RECOMMENDATION_PROVIDER || 'vnstock', useIntradayReference: true, limit: Math.min(5, Math.max(3, Number(process.env.RECOMMENDATION_LIMIT || 5))), horizonDays: Number(process.env.RECOMMENDATION_HORIZON || 20) });
        logger.info(`[Recommendations] ${JSON.stringify(snapshot)}`);
      }
    } catch (error) {
      evidence.error = error.message;
      runtimeStatus.last_error = error.message;
      logger.error(`[Vnstock EOD] ${error.stack || error.message}`);
    } finally {
      try {
        evidence.after = await eodCoverage(models.sequelize, sessionDate,
          process.env.VNSTOCK_SYMBOLS?.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) || null);
        evidence.complete = !evidence.error && evidence.after.symbols > 0 && evidence.after.missing_symbols.length === 0;
        const directory = path.resolve(__dirname, '../../evidence');
        await fs.mkdir(directory, { recursive: true });
        evidence.evidence_file = `eod-scheduled-${sessionDate}-${checkedAt.toISOString().replace(/[:.]/g, '-')}.json`;
        await fs.writeFile(path.join(directory, evidence.evidence_file), JSON.stringify(evidence, null, 2));
        logger.info(`[Vnstock EOD coverage] ${JSON.stringify(evidence.after)}`);
      } catch (error) { logger.error(`[Vnstock EOD evidence] ${error.message}`); }
      running = false;
      runtimeStatus.running = false;
      runtimeStatus.phase = 'idle';
      runtimeStatus.finished_at = new Date().toISOString();
    }
    return evidence;
  };
  const retryGaps = async () => {
    if (running) { logger.info('[Vnstock EOD retry] Previous run still active; skipping overlap'); return null; }
    const sessionDate = completedSessionDate(new Date());
    const coverage = await eodCoverage(models.sequelize, sessionDate, process.env.VNSTOCK_SYMBOLS?.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) || null);
    if (!coverage.missing_symbols.length) return { session_date: sessionDate, missing: 0, skipped: true };
    running = true;
    runtimeStatus.running = true;
    runtimeStatus.phase = 'gap_retry';
    runtimeStatus.session_date = sessionDate;
    runtimeStatus.started_at = new Date().toISOString();
    runtimeStatus.last_error = null;
    const retryLimit = Math.max(1, Number(process.env.VNSTOCK_EOD_GAP_RETRY_LIMIT || 25));
    const selectedSymbols = await prioritizeMissingSymbols(models.sequelize, sessionDate, coverage.missing_symbols, retryLimit);
    const evidence = { checked_at: runtimeStatus.started_at, session_date: sessionDate, requested: coverage.missing_symbols.length, selected: selectedSymbols.length, retry_limit: retryLimit, selected_symbols: selectedSymbols };
    try {
      const options = buildOptions(sessionDate);
      const passes = Math.max(1, Number(process.env.VNSTOCK_EOD_GAP_RETRY_PASSES || 1));
      evidence.retries = [];
      let missing = selectedSymbols;
      for (let pass = 1; pass <= passes && missing.length; pass += 1) {
        const ingestion = await ingestVnstockEod({ ...options, symbols: missing });
        const after = await eodCoverage(models.sequelize, sessionDate, missing);
        evidence.retries.push({ pass, requested: missing.length, ingestion, remaining: after.missing_symbols.length });
        missing = after.missing_symbols;
      }
      evidence.after = await eodCoverage(models.sequelize, sessionDate, options.symbols || null);
      evidence.complete = evidence.after.missing_symbols.length === 0;
      logger.info(`[Vnstock EOD retry] ${JSON.stringify(evidence.after)}`);
      return evidence;
    } catch (error) {
      evidence.error = error.message;
      runtimeStatus.last_error = error.message;
      logger.error(`[Vnstock EOD retry] ${error.stack || error.message}`);
      return evidence;
    } finally {
      try {
        const directory = path.resolve(__dirname, '../../evidence');
        await fs.mkdir(directory, { recursive: true });
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        evidence.evidence_file = `eod-retry-${sessionDate}-${stamp}.json`;
        await fs.writeFile(path.join(directory, evidence.evidence_file), JSON.stringify(evidence, null, 2));
      } catch (error) { logger.error(`[Vnstock EOD retry evidence] ${error.message}`); }
      running = false;
      runtimeStatus.running = false;
      runtimeStatus.phase = 'idle';
      runtimeStatus.finished_at = new Date().toISOString();
    }
  };
  const task = cron.schedule(schedule, runOnce, { timezone: process.env.VNSTOCK_EOD_TIMEZONE || 'Asia/Ho_Chi_Minh' });
  task.runOnce = runOnce;
  task.retryGaps = retryGaps;
  task.retryTask = cron.schedule(retrySchedule, retryGaps, { timezone: process.env.VNSTOCK_EOD_TIMEZONE || 'Asia/Ho_Chi_Minh' });
  return task;
}

module.exports = startVnstockEodJob;
module.exports.completedSessionDate = completedSessionDate;
module.exports.getEodRetryStatus = () => ({ ...runtimeStatus });

