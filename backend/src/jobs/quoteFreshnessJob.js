'use strict';

const cron = require('node-cron');
const { marketPhaseAt, runQuoteFreshnessProbe } = require('../../scripts/verify-quote-freshness.cjs');

function startQuoteFreshnessJob({
  logger = console,
  schedule = process.env.QUOTE_FRESHNESS_CRON || '35 9,13 * * 1-5',
  timezone = process.env.QUOTE_FRESHNESS_TIMEZONE || 'Asia/Ho_Chi_Minh',
  runProbe = runQuoteFreshnessProbe,
  now = () => new Date()
} = {}) {
  if (process.env.QUOTE_FRESHNESS_ENABLED === 'false') return null;
  let running = false;
  return cron.schedule(schedule, async () => {
    const phase = marketPhaseAt(now());
    if (!['morning_session', 'afternoon_session'].includes(phase)) return;
    if (running) return;
    running = true;
    try {
      const report = await runProbe({
        base: process.env.QUOTE_API_URL || `http://127.0.0.1:${process.env.PORT || 5000}`
      });
      const message = `[Quote freshness] ${JSON.stringify(report)}`;
      if (report.error) logger.error(message);
      else logger.info(message);
    } catch (error) {
      logger.error(`[Quote freshness] ${error.stack || error.message}`);
    } finally {
      running = false;
    }
  }, { timezone });
}

module.exports = { startQuoteFreshnessJob };
