'use strict';

function vietnamSessionDate(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function rowPrice(row = {}) {
  const value = Number(row.close ?? row.price);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function recommendationUniverseReadiness({ stocks = [], prices = [], minimumHistoricalSessions = 50 } = {}) {
  const minimum = Math.max(1, Math.floor(Number(minimumHistoricalSessions) || 50));
  const listedStockIds = new Set(stocks.map(stock => String(stock.id)));
  const scopedPrices = prices.filter(row => listedStockIds.has(String(row.stock_id)));
  const datesByStock = new Map();
  const allSessions = new Set();
  for (const row of scopedPrices) {
    const date = vietnamSessionDate(row.observed_at);
    if (!date || rowPrice(row) == null) continue;
    const stockId = String(row.stock_id);
    if (!datesByStock.has(stockId)) datesByStock.set(stockId, new Set());
    datesByStock.get(stockId).add(date);
    allSessions.add(date);
  }
  const latest_eod_session = [...allSessions].sort().at(-1) || null;
  const coverage = stocks.map(stock => {
    const dates = datesByStock.get(String(stock.id)) || new Set();
    const historical_sessions = [...dates].filter(date => !latest_eod_session || date < latest_eod_session).length;
    const eligible = historical_sessions >= minimum;
    const covered = Boolean(latest_eod_session && dates.has(latest_eod_session));
    return { code: stock.code, historical_sessions, covered, eligible, observations: dates.size };
  });
  const model_universe = coverage.filter(item => item.eligible);
  const missing_symbols = model_universe.filter(item => !item.covered).map(item => item.code);
  const eligible_symbols = model_universe.filter(item => item.covered).length;
  return {
    universe_size: stocks.length,
    price_rows: scopedPrices.length,
    distinct_sessions: allSessions.size,
    latest_eod_session,
    minimum_observations: minimum,
    model_universe_symbols: model_universe.length,
    eligible_symbols,
    missing_symbols,
    ready_for_recommendations: model_universe.length > 0 && missing_symbols.length === 0,
    coverage,
  };
}

module.exports = { recommendationUniverseReadiness, vietnamSessionDate };
