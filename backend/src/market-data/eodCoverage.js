'use strict';

async function eodCoverage(sequelize, sessionDate, symbols = null, { minimumHistoricalSessions = 0 } = {}) {
  const requiredHistory = Math.max(0, Math.floor(Number(minimumHistoricalSessions) || 0));
  const [rows] = await sequelize.query(`
    SELECT s.code, EXISTS (
      SELECT 1 FROM stock_prices p WHERE p.stock_id = s.id
      AND p.provider = 'vnstock' AND p.interval = '1d'
      AND (p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = $1::date
      AND COALESCE(p.close, p.price) > 0
    ) AS covered FROM stocks s
    WHERE s.listing_status = 'listed'
      AND ($2::text[] IS NULL OR s.code = ANY($2::text[]))
      AND ($3::integer = 0 OR (
        SELECT COUNT(DISTINCT (p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
        FROM stock_prices p
        WHERE p.stock_id = s.id AND p.provider = 'vnstock' AND p.interval = '1d'
          AND (p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date < $1::date
          AND COALESCE(p.close, p.price) > 0
      ) >= $3::integer)
    ORDER BY s.code
  `, { bind: [sessionDate, symbols, requiredHistory] });
  return { session_date: sessionDate, minimum_historical_sessions: requiredHistory, symbols: rows.length,
    covered: rows.filter(row => row.covered).length,
    missing_symbols: rows.filter(row => !row.covered).map(row => row.code) };
}

module.exports = { eodCoverage };
