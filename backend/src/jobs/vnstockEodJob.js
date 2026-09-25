'use strict';

const cron = require('node-cron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { ingestVnstockEod, defaultWindow } = require('../market-data/vnstockEodIngestion');
const { eodCoverage } = require('../market-data/eodCoverage');
const models = require('../models');
const { generateRecommendationSnapshot } = require('../services/recommendationPersistence');

function holidaySet(value = process.env.VNSTOCK_HOLIDAYS || '') {
  return new Set(String(value).split(',').map(item => item.trim()).filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item)));
}

function completedSessionDate(checkedAt = new Date(), holidays = holidaySet()) {
  const target = new Date(checkedAt.getTime() + 7 * 60 * 60 * 1000);
  while ([0, 6].includes(target.getUTCDay()) || holidays.has(target.toISOString().slice(0, 10))) target.setUTCDate(target.getUTCDate() - 1);
  return target.toISOString().slice(0, 10);
}

function startVnstockEodJob({ cacheService, logger = console, schedule = process.env.VNSTOCK_EOD_CRON || '30 16 * * 1-5' } = {}) {
  // Keep daily EOD ingestion on by default so a fresh deployment cannot silently
  // fall back to intraday-only charts. Set VNSTOCK_EOD_ENABLED=false to opt out.
  if (process.env.VNSTOCK_EOD_ENABLED === 'false') return null;
  let running = false;
  const runOnce = async () => {
    if (running) { logger.info('[Vnstock EOD] Previous run still active; skipping overlap'); return; }
    running = true;
    const checkedAt = new Date();
    const window = defaultWindow(checkedAt);
    // Run after the local market close and target the completed local session.
    // On Saturday/Sunday, roll back to Friday; exchange holidays remain
    // explicit coverage gaps instead of being guessed here.
    const sessionDate = completedSessionDate(checkedAt);
    const evidence = { checked_at: checkedAt.toISOString(), session_date: sessionDate };
    try {
      const options = {
        ...models,
        cacheService,
        symbols: process.env.VNSTOCK_SYMBOLS?.split(',').map(s => s.trim().toUpperCase()).filter(Boolean),
        from: window.from, to: sessionDate,
        source: process.env.VNSTOCK_SOURCE || 'vci',
        marketBySymbol: JSON.parse(process.env.VNSTOCK_MARKETS || '{}'),
        env: { VNSTOCK_PROJECT_DIR: process.env.VNSTOCK_PROJECT_DIR || '.vnstock' }
      };
      const report = await ingestVnstockEod(options);
      evidence.ingestion = report;
      evidence.before_retry = await eodCoverage(models.sequelize, sessionDate, options.symbols || null);
      if (evidence.before_retry.missing_symbols.length) {
        evidence.retry = await ingestVnstockEod({ ...options,
          symbols: evidence.before_retry.missing_symbols, from: sessionDate, to: sessionDate });
      }
      logger.info(`[Vnstock EOD] ${JSON.stringify(report)}`);
      if (process.env.RECOMMENDATIONS_AFTER_INGEST === 'true') {
        const snapshot = await generateRecommendationSnapshot({ ...models, provider: process.env.RECOMMENDATION_PROVIDER || 'vnstock', useIntradayReference: true, limit: Math.min(5, Math.max(3, Number(process.env.RECOMMENDATION_LIMIT || 5))), horizonDays: Number(process.env.RECOMMENDATION_HORIZON || 20) });
        logger.info(`[Recommendations] ${JSON.stringify(snapshot)}`);
      }
    } catch (error) {
      evidence.error = error.message;
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
    }
    return evidence;
  };
  const task = cron.schedule(schedule, runOnce, { timezone: process.env.VNSTOCK_EOD_TIMEZONE || 'Asia/Ho_Chi_Minh' });
  task.runOnce = runOnce;
  return task;
}

module.exports = startVnstockEodJob;
module.exports.completedSessionDate = completedSessionDate;

