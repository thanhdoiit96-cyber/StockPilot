'use strict';

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const models = require('../src/models');
const CacheService = require('../src/services/cacheService');
const startJob = require('../src/jobs/vnstockEodJob');

async function main() {
  const symbols = process.env.EOD_VERIFY_SYMBOLS?.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  if (!symbols?.length || symbols.length > 10 || symbols.some(s => !/^[A-Z0-9]{2,10}$/.test(s))) {
    throw new Error('Set EOD_VERIFY_SYMBOLS to 1–10 existing symbols; do not run alongside ingestion');
  }
  const existing = new Set((await models.Stock.findAll({ attributes: ['code'], where: { code: symbols } })).map(stock => stock.code));
  const unknown = symbols.filter(symbol => !existing.has(symbol));
  if (unknown.length) throw new Error(`Unknown stock symbols: ${unknown.join(', ')}`);
  process.env.VNSTOCK_SYMBOLS = [...new Set(symbols)].join(',');
  process.env.VNSTOCK_EOD_ENABLED = 'true';
  process.env.RECOMMENDATIONS_AFTER_INGEST = 'false';
  const task = startJob({ cacheService: new CacheService(models.sequelize), schedule: '0 0 1 1 *' });
  task.stop();
  const report = await task.runOnce();
  console.log(JSON.stringify({ evidence_file: report.evidence_file, complete: report.complete, coverage: report.after }));
  if (!report.complete || !report.evidence_file) process.exitCode = 1;
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => models.sequelize.close());
