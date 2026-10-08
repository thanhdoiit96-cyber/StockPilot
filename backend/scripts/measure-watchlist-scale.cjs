'use strict';
const { sequelize } = require('../src/models');

async function main() {
  const [rows] = await sequelize.query(`
    WITH per_user AS (
      SELECT user_id, COUNT(*)::integer AS item_count
      FROM watchlist_items
      GROUP BY user_id
    )
    SELECT
      COALESCE(SUM(item_count), 0)::integer AS total_items,
      COUNT(*)::integer AS users_with_items,
      COALESCE(MAX(item_count), 0)::integer AS max_items,
      COALESCE(ROUND(AVG(item_count), 2), 0) AS avg_items,
      COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY item_count), 0) AS p50_items,
      COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY item_count), 0) AS p95_items
    FROM per_user
  `);
  console.log(JSON.stringify({ scope: 'development_watchlist_aggregate', ...rows[0] }));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => sequelize.close());
