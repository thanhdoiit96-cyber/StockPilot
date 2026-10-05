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
  const volumeAdvances = numberOrZero(row.volume_advances);
  const volumeDeclines = numberOrZero(row.volume_declines);
  const volumeUnchanged = numberOrZero(row.volume_unchanged);
  const volumeObservations = numberOrZero(row.volume_observations);
  const directionalVolume = volumeAdvances + volumeDeclines;
  const totalVolume = directionalVolume + volumeUnchanged;
  const volumeNet = volumeAdvances - volumeDeclines;
  const volumeSignal = volumeObservations <= 0 || directionalVolume <= 0
    ? 'unavailable'
    : advances - declines > 0 && volumeNet < 0
      ? 'negative_divergence'
      : advances - declines < 0 && volumeNet > 0
        ? 'positive_divergence'
        : advances - declines === 0 || volumeNet === 0
          ? 'neutral'
          : 'confirmation';
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
      advances: volumeAdvances,
      declines: volumeDeclines,
      unchanged: volumeUnchanged,
      observations: volumeObservations,
      coverage_pct: classified > 0 ? Number((volumeObservations / classified * 100).toFixed(1)) : null,
      directional_total: directionalVolume,
      total: totalVolume,
      net: volumeNet,
      net_pct: directionalVolume > 0 ? Number((volumeNet / directionalVolume * 100).toFixed(1)) : null,
      ad_ratio: volumeDeclines > 0 ? Number((volumeAdvances / volumeDeclines).toFixed(4)) : null,
      advancing_pct: directionalVolume > 0 ? Number((volumeAdvances / directionalVolume * 100).toFixed(1)) : null,
      signal: volumeSignal
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

function buildMarketBreadthHistory(rows, { sessions, exchange = null, sector = null, sectorLabel = null } = {}) {
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
    sector,
    sector_label: sectorLabel,
    requested_sessions: requestedSessions,
    returned_sessions: points.length,
    points,
    continuity: { status, gaps },
    source: 'vnstock_eod',
    methodology: 'Per-symbol EOD close versus the preceding stored market session; volume breadth groups observed EOD volume by price direction. Missing observations are excluded, never imputed, and volume is not aggressor-side order flow.'
  };
}

module.exports = { buildMarketBreadthHistory };
