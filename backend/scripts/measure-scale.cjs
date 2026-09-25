// Read-only scale probe for the 300/500-symbol roadmap checkpoint.
const { performance } = require('node:perf_hooks');
const { Sequelize, QueryTypes } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'postgres',
  logging: false
});

async function timed(label, query, replacements = {}) {
  const started = performance.now();
  const rows = await sequelize.query(query, { replacements, type: QueryTypes.SELECT });
  return { label, milliseconds: Number((performance.now() - started).toFixed(2)), rows: rows.length };
}

async function main() {
  try {
    const counts = await sequelize.query(`
      SELECT
        (SELECT COUNT(*)::int FROM stocks) AS stocks,
        (SELECT COUNT(DISTINCT stock_id)::int FROM stock_prices WHERE observed_at IS NOT NULL) AS covered_stocks,
        (SELECT COUNT(*)::int FROM stock_prices) AS price_rows
    `, { type: QueryTypes.SELECT });
    const latestPerStock = `
      SELECT s.id, s.code, latest.close, latest.observed_at
      FROM stocks s
      LEFT JOIN LATERAL (
        SELECT sp.close, sp.observed_at
        FROM stock_prices sp
        WHERE sp.stock_id = s.id AND sp.observed_at IS NOT NULL
        ORDER BY sp.observed_at DESC NULLS LAST, sp.id DESC
        LIMIT 1
      ) latest ON TRUE
      ORDER BY s.code ASC
      LIMIT :limit
    `;
    const measurements = [];
    for (const limit of [300, 500]) {
      // Warm the connection/query plan, then report the measured read.
      await sequelize.query(latestPerStock, { replacements: { limit }, type: QueryTypes.SELECT });
      measurements.push(await timed(`latest-per-stock-${limit}`, latestPerStock, { limit }));
    }
    const session = await timed('latest-vnstock-sessions', `
      SELECT DISTINCT (observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS session_date
      FROM stock_prices
      WHERE provider = 'vnstock' AND interval = '1d' AND observed_at IS NOT NULL
      ORDER BY session_date DESC
      LIMIT 3
    `);
    console.log(JSON.stringify({ counts: counts[0], measurements: [...measurements, session] }, null, 2));
  } finally {
    await sequelize.close();
  }
}

main().catch(error => {
  console.error(`Scale probe failed: ${error.message}`);
  process.exitCode = 1;
});
