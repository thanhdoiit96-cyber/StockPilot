'use strict';

const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const models = require('../src/models');

async function main() {
  const sessionDate = process.env.CHART_AUDIT_DATE || '2026-09-21';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate) || Number.isNaN(Date.parse(`${sessionDate}T00:00:00Z`))) {
    throw new Error('CHART_AUDIT_DATE must use YYYY-MM-DD');
  }

  const [rows] = await models.sequelize.query(`
    WITH per_session AS (
      SELECT s.id AS stock_id, s.code, s.listing_status,
        (p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS session_date,
        COUNT(p.id)::int AS records
      FROM stocks s
      LEFT JOIN stock_prices p ON p.stock_id = s.id AND p.observed_at IS NOT NULL
        AND p.provider = 'vnstock' AND p.interval = '1d'
      GROUP BY s.id, s.code, s.listing_status, session_date
    ), history AS (
      SELECT s.id AS stock_id, COUNT(p.id)::int AS null_observation_records
      FROM stocks s
      LEFT JOIN stock_prices p ON p.stock_id = s.id AND p.observed_at IS NULL
        AND p.provider = 'vnstock' AND p.interval = '1d'
      GROUP BY s.id
    )
    SELECT ps.code, ps.listing_status,
      COUNT(ps.session_date)::int AS sessions,
      MAX(ps.session_date)::text AS latest_session,
      COALESCE(BOOL_OR(ps.session_date = $1::date), false) AS has_target_session,
      COUNT(*) FILTER (WHERE ps.session_date IS NOT NULL AND ps.records > 1)::int AS duplicate_sessions,
      h.null_observation_records
    FROM per_session ps
    JOIN history h ON h.stock_id = ps.stock_id
    GROUP BY ps.stock_id, ps.code, ps.listing_status, h.null_observation_records
    ORDER BY ps.code
  `, { bind: [sessionDate] });

  const report = {
    checked_at: new Date().toISOString(),
    session_date: sessionDate,
    symbols: rows.length,
    target_session_coverage: rows.filter(row => row.has_target_session).length,
    missing_target_session: rows.filter(row => !row.has_target_session).map(row => ({ code: row.code, listing_status: row.listing_status, latest_session: row.latest_session })),
    empty_history: rows.filter(row => Number(row.sessions) === 0).map(row => row.code),
    duplicate_sessions: rows.filter(row => Number(row.duplicate_sessions) > 0).map(row => ({ code: row.code, count: Number(row.duplicate_sessions) })),
    null_observation_records: rows.filter(row => Number(row.null_observation_records) > 0).map(row => ({ code: row.code, count: Number(row.null_observation_records) })),
    rows
  };
  report.evidence_file = `chart-history-audit-${sessionDate}-${report.checked_at.replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(path.resolve(__dirname, '../evidence', report.evidence_file), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => models.sequelize.close());
