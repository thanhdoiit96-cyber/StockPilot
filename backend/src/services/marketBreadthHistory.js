const numberOrZero = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const nullableNumber = value => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);

function normalizePoint(row) {
  const advances = numberOrZero(row.advances);
  const declines = numberOrZero(row.declines);
  const unchanged = numberOrZero(row.unchanged);
  const classified = numberOrZero(row.classified);
  const covered = numberOrZero(row.covered);
  const universe = numberOrZero(row.universe);
  const tradedValueObservations = numberOrZero(row.traded_value_observations);
  return {
    session_date: String(row.session_date),
    advances,
    declines,
    unchanged,
    classified,
    covered,
    universe,
    ad_ratio: declines > 0 ? Number((advances / declines).toFixed(4)) : null,
    spread: advances - declines,
    coverage_pct: universe > 0 ? Number((covered / universe * 100).toFixed(1)) : null,
    volume: {
      advances: numberOrZero(row.volume_advances),
      declines: numberOrZero(row.volume_declines),
      unchanged: numberOrZero(row.volume_unchanged)
    },
    traded_value: tradedValueObservations > 0 ? nullableNumber(row.traded_value) : null,
    traded_value_observations: tradedValueObservations
  };
}

function gapDays(previous, current) {
  const start = Date.parse(`${previous}T00:00:00Z`);
  const end = Date.parse(`${current}T00:00:00Z`);
  return Number.isFinite(start) && Number.isFinite(end) ? Math.round((end - start) / 86400000) : null;
}

function buildMarketBreadthHistory(rows, { sessions, exchange = null } = {}) {
  const parsedSessions = Number(sessions);
  const requestedSessions = Number.isFinite(parsedSessions) ? Math.min(60, Math.max(1, parsedSessions)) : 20;
  const points = (rows || []).map(normalizePoint).sort((left, right) => left.session_date.localeCompare(right.session_date));
  const gaps = [];
  for (let index = 1; index < points.length; index += 1) {
    const days = gapDays(points[index - 1].session_date, points[index].session_date);
    if (days == null || days < 1 || days > 3) gaps.push({ from: points[index - 1].session_date, to: points[index].session_date, calendar_days: days });
  }
  const hasClassifiedData = points.every(point => point.classified > 0);
  const status = points.length < requestedSessions || !hasClassifiedData
    ? 'insufficient_data'
    : gaps.length ? 'gapped' : 'continuous';
  return {
    exchange,
    requested_sessions: requestedSessions,
    returned_sessions: points.length,
    points,
    continuity: { status, gaps },
    source: 'vnstock_eod',
    methodology: 'Per-symbol EOD close versus the preceding stored market session; missing observations are excluded, never imputed.'
  };
}

module.exports = { buildMarketBreadthHistory };
