'use strict';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { sequelize } = require('../src/models');
const { adaptForecastEvidence } = require('../src/services/forecastEvidenceAdapter');
async function main() {
  const cutoff = new Date().toISOString();
  const report = await sequelize.transaction({ isolationLevel: 'REPEATABLE READ' }, async transaction => {
    await sequelize.query('SET TRANSACTION READ ONLY', { transaction });
    await sequelize.query("SET LOCAL statement_timeout = '30s'", { transaction });
    const [rows] = await sequelize.query(`SELECT id, stock_id, provider, interval, close, observed_at, source_hash
      FROM stock_prices WHERE interval = '1d' ORDER BY observed_at DESC NULLS LAST, id LIMIT 100001`, { transaction });
    if (rows.length > 100000) throw new Error('Row cap exceeded; narrow the audit scope before continuing');
    // No evidence repository is connected yet. Do not invent attestations from flags.
    const result = adaptForecastEvidence({ rows, evidence: [], cutoff });
    return { version: result.version, cutoff, scope: 'all stored daily rows, capped at 100000', synthetic: false,
      evidence_source: 'not_configured', status: result.status, input_count: result.input_count,
      accepted_count: result.accepted_count, excluded_count: result.excluded_count, reason_counts: result.reason_counts,
      excluded_examples: result.excluded.slice(0, 10), calendar_status: 'not_verified',
      interpretation: 'Missing supplied attestations; not proof that provider prices are wrong. No training or accuracy calculation.' };
  });
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error('Forecast exclusion report failed:', error.message); process.exitCode = 1; }).finally(() => sequelize.close());
