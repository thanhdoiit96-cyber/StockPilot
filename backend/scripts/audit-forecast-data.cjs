'use strict';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { sequelize } = require('../src/models');

async function main() {
  const report = await sequelize.transaction({ isolationLevel: 'REPEATABLE READ' }, async transaction => {
    await sequelize.query('SET TRANSACTION READ ONLY', { transaction });
    await sequelize.query("SET LOCAL statement_timeout = '30s'", { transaction });
    const query = async sql => (await sequelize.query(sql, { transaction }))[0];
    return {
      version: 'forecast_data_audit_v1', checked_at: new Date().toISOString(),
      forecast_dataset_gate: { target_version: 'breadth_forward_v1', status: 'unavailable',
        reasons: ['verified_calendar_not_supplied', 'historical_availability_not_verified', 'price_basis_and_market_events_not_verified'],
        interpretation: 'Required evidence is not wired to this audit; no eligible training samples or accuracy claimed' },
      scope: 'Stored daily observations; observed dates are not an exchange calendar',
      sources: await query(`SELECT provider, count(*)::int AS rows, count(DISTINCT stock_id)::int AS symbols,
        min(observed_at) AS first_observation, max(observed_at) AS last_observation,
        count(*) FILTER (WHERE observed_at IS NULL)::int AS missing_observed_at,
        count(*) FILTER (WHERE close IS NULL OR close <= 0)::int AS invalid_close,
        count(*) FILTER (WHERE fetched_at IS NULL)::int AS missing_fetched_at,
        count(*) FILTER (WHERE is_adjusted IS TRUE)::int AS adjusted,
        count(*) FILTER (WHERE is_adjusted IS FALSE)::int AS unadjusted,
        count(*) FILTER (WHERE is_adjusted IS NULL)::int AS adjustment_unknown,
        count(*) FILTER (WHERE volume IS NULL)::int AS missing_volume
        FROM stock_prices WHERE interval = '1d' GROUP BY provider ORDER BY provider`),
      history: await query(`WITH per_symbol AS (
        SELECT provider, stock_id, count(DISTINCT (observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::int AS sessions
        FROM stock_prices WHERE interval = '1d' AND close > 0 GROUP BY provider, stock_id)
        SELECT provider, min(sessions) AS minimum, percentile_cont(0.5) WITHIN GROUP (ORDER BY sessions) AS median,
        max(sessions) AS maximum, count(*) FILTER (WHERE sessions >= 60)::int AS at_least_60,
        count(*) FILTER (WHERE sessions >= 250)::int AS at_least_250,
        count(*) FILTER (WHERE sessions >= 750)::int AS at_least_750 FROM per_symbol GROUP BY provider`),
      duplicate_sessions: await query(`SELECT provider, count(*)::int AS groups FROM (
        SELECT provider, stock_id, (observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS session
        FROM stock_prices WHERE interval = '1d' AND observed_at IS NOT NULL GROUP BY 1,2,3 HAVING count(*) > 1
        ) duplicates GROUP BY provider`),
      recent_coverage: await query(`SELECT provider, (observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS session,
        count(DISTINCT stock_id)::int AS symbols FROM stock_prices
        WHERE interval = '1d' AND close > 0 AND observed_at IS NOT NULL GROUP BY 1,2 ORDER BY session DESC, provider LIMIT 30`),
      supporting_schema: await query(`SELECT table_name, column_name FROM information_schema.columns
        WHERE table_schema = current_schema() AND (table_name ~ '(corporate|index|listing|calendar|membership)'
        OR (table_name IN ('stock_prices','stocks') AND column_name ~ '(available|fetched|adjust|listed|status|exchange)'))
        ORDER BY table_name, ordinal_position`),
      limitations: ['fetched_at is ingestion time, not proof of original publication time',
        'Current stock metadata does not establish historical membership',
        'Portfolio corporate events do not establish market-wide corporate-action coverage',
        'Audit counts do not certify forecast training eligibility']
    };
  });
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error('Forecast audit failed:', error.name); process.exitCode = 1; })
  .finally(() => sequelize.close());
