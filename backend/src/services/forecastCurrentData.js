'use strict';

const { assertForecastModeGate } = require('./forecastModeGate');

function normalizeCurrentDataRows(rows = []) {
  if (!Array.isArray(rows)) throw new TypeError('current-data rows must be an array');
  return rows
    .map(row => ({
      ...row,
      observed_at: row?.observed_at || row?.time || row?.date || row?.trading_date,
      instrument: row?.instrument || {},
      quote: row?.quote || {}
    }))
    .filter(row => typeof row.observed_at === 'string' && row.observed_at.trim() !== '');
}

async function fetchCurrentForecastData({
  adapter,
  symbols = [],
  now = () => new Date(),
  maximumStalenessDays = 7,
  localOnly = true,
  license = '',
  provider = 'vnstock',
  minimumSamples = 1,
  coverage = 1,
  evidenceIntegrity = true
} = {}) {
  if (!adapter || typeof adapter.fetchQuotes !== 'function') {
    const error = new Error('current_forecast_data_unavailable:no_adapter');
    error.code = 'current_forecast_data_unavailable';
    throw error;
  }

  const referenceNow = now instanceof Date ? now : new Date(now);
  const to = referenceNow.toISOString().slice(0, 10);
  const from = new Date(referenceNow.getTime() - 120 * 86400000).toISOString().slice(0, 10);
  const rows = normalizeCurrentDataRows(await adapter.fetchQuotes({ symbols, from, to }));
  if (!rows.length) {
    const error = new Error('current_forecast_data_unavailable:no_quotes');
    error.code = 'current_forecast_data_unavailable';
    throw error;
  }

  const latest = rows.slice().sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at))[0];
  const latestTimestamp = Date.parse(latest.observed_at);
  if (!Number.isFinite(latestTimestamp)) {
    const error = new Error('current_forecast_data_unavailable:invalid_timestamp');
    error.code = 'current_forecast_data_unavailable';
    throw error;
  }

  const stalenessMs = Math.max(0, referenceNow.getTime() - latestTimestamp);
  const stalenessDays = stalenessMs / (24 * 60 * 60 * 1000);
  const isStale = stalenessDays > Number(maximumStalenessDays || 7);

  if (isStale) {
    const error = new Error('live_forecast_gate_not_passed:staleness');
    error.code = 'live_forecast_gate_not_passed';
    throw error;
  }

  const gateInput = {
    mode: 'live',
    provider: adapter.provider || provider,
    local_only: localOnly,
    license,
    synthetic: false,
    research_only: false,
    live: true,
    evidence_integrity: evidenceIntegrity,
    coverage,
    sample_count: rows.length,
    minimum_samples: minimumSamples,
    as_of: latest.observed_at,
    now: referenceNow.toISOString(),
    maximum_staleness_days: Number(maximumStalenessDays || 7)
  };

  assertForecastModeGate(gateInput);

  return {
    status: 'current_data_ready',
    provider: adapter.provider || provider,
    as_of: latest.observed_at,
    fetched_at: referenceNow.toISOString(),
    staleness_days: stalenessDays,
    maximum_staleness_days: Number(maximumStalenessDays || 7),
    live: true,
    synthetic: false,
    research_only: false,
    market_accuracy_verified: false,
    rows,
    requested_symbols: [...new Set(symbols.map(symbol => String(symbol).trim().toUpperCase()).filter(Boolean))],
    current_data: rows,
    source: 'live_provider'
  };
}

module.exports = { fetchCurrentForecastData };
