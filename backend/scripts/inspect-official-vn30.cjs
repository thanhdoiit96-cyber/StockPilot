'use strict';
require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env') });
const models = require('../src/models');
const { readOfficialVn30Preview } = require('../src/services/officialVn30Preview');
async function main() {
  const started = performance.now();
  const preview = await readOfficialVn30Preview(models, { horizon: 5 });
  console.log(JSON.stringify({ preview, elapsed_ms: Math.round(performance.now() - started) }));
  // Owner-only terminal diagnosis. Constituent names are never returned by the API.
  const rows = await models.sequelize.query(`SELECT c.symbol,
    count(DISTINCT (p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::int AS stored_dates,
    max(p.observed_at) AS latest
    FROM index_membership_constituents c LEFT JOIN stocks s ON s.code = c.symbol
    LEFT JOIN stock_prices p ON p.stock_id = s.id AND p.provider = 'vnstock' AND p.interval = '1d'
    WHERE c.snapshot_id = (SELECT id FROM index_membership_snapshots WHERE index_code='VN30' AND status='sealed'
      AND effective_from <= CAST(:asOf AS date) AND (effective_to IS NULL OR effective_to >= CAST(:asOf AS date)) ORDER BY effective_from DESC, ingested_at DESC LIMIT 1)
    GROUP BY c.symbol ORDER BY c.symbol`, { replacements: { asOf: preview.as_of }, type: models.Sequelize.QueryTypes.SELECT });
  console.log(JSON.stringify({ history_inventory: rows, note: 'Inventory only; preview additionally validates basis, hashes, duplicates and aligned calendars.' }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => models.sequelize.close());
