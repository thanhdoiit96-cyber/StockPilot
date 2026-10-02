'use strict';

function normalizeTransactionPrice(price) {
  const value = Number(price);
  return value > 0 && value < 1000 ? value * 1000 : value;
}

function normalizeRecommendationContext(value, transactionSymbol = null) {
  if (value == null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Nguồn đề xuất không hợp lệ');
  const source = String(value.source || '');
  const symbol = String(value.symbol || transactionSymbol || '').trim().toUpperCase();
  const horizonDays = Number(value.horizon_days);
  const score = Number(value.score);
  const referencePrice = normalizeTransactionPrice(value.expected_entry_price);
  const generatedAt = new Date(value.generated_at);
  if (!['personalized', 'scheduled'].includes(source) || !/^[A-Z0-9]{1,10}$/.test(symbol) || (transactionSymbol && symbol !== String(transactionSymbol).trim().toUpperCase()) || !Number.isInteger(horizonDays) || horizonDays < 1 || horizonDays > 60 || !Number.isFinite(score) || score < 0 || score > 100 || !Number.isFinite(referencePrice) || referencePrice <= 0 || Number.isNaN(generatedAt.getTime())) throw new Error('Thông tin kỳ vọng đề xuất không hợp lệ');
  const criteria = {};
  if (value.criteria && typeof value.criteria === 'object' && !Array.isArray(value.criteria)) {
    for (const key of ['trend', 'momentum', 'rsi', 'stability', 'liquidity']) {
      if (value.criteria[key] == null) continue;
      const weight = Number(value.criteria[key]);
      if (!Number.isFinite(weight) || weight < 0 || weight > 100) throw new Error('Trọng số tiêu chí đề xuất không hợp lệ');
      criteria[key] = weight;
    }
  }
  return {
    source,
    symbol,
    model: String(value.model || '').slice(0, 80) || null,
    generated_at: generatedAt.toISOString(),
    horizon_days: horizonDays,
    score: Number(score.toFixed(2)),
    rank: Number.isInteger(Number(value.rank)) && Number(value.rank) > 0 ? Number(value.rank) : null,
    expected_entry_price: referencePrice,
    criteria: Object.keys(criteria).length ? criteria : null
  };
}

function vietnamTradingDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}

function uniqueForwardSessions(rows = [], generatedAt = null) {
  const generatedTime = generatedAt == null ? null : new Date(generatedAt).getTime();
  const sessions = new Map();
  for (const row of rows) {
    if (row.interval && !['1d', '1D', 'daily'].includes(String(row.interval))) continue;
    const observedAt = row.observed_at || row.date;
    const observedTime = new Date(observedAt).getTime();
    if (!Number.isFinite(observedTime) || (Number.isFinite(generatedTime) && observedTime <= generatedTime)) continue;
    const tradingDate = vietnamTradingDate(observedAt);
    if (!tradingDate) continue;
    const existing = sessions.get(tradingDate);
    if (!existing || observedTime > existing.observedTime || (observedTime === existing.observedTime && String(row.id || '') > String(existing.row.id || ''))) {
      sessions.set(tradingDate, { row, observedTime });
    }
  }
  return [...sessions.entries()].sort(([dateA], [dateB]) => dateA.localeCompare(dateB)).map(([, entry]) => entry.row);
}

function evaluateRecommendationEntry({ recommendation = {}, actualEntryPrice = null, currentEodPrice = null, futureRows = [] } = {}) {
  const horizonDays = Number(recommendation.horizon_days || 20);
  const target = futureRows[horizonDays - 1] || null;
  const referencePrice = Number(recommendation.expected_entry_price);
  const horizonPrice = Number(target?.close ?? target?.price);
  const forwardReturn = target && referencePrice > 0 && Number.isFinite(horizonPrice) ? Number(((horizonPrice / referencePrice - 1) * 100).toFixed(3)) : null;
  return {
    actual_entry_price: actualEntryPrice == null ? null : Number(actualEntryPrice),
    current_eod_price: currentEodPrice == null ? null : Number(currentEodPrice),
    status: target ? 'evaluated' : 'pending',
    sessions_observed: Math.min(futureRows.length, horizonDays),
    horizon_days: horizonDays,
    horizon_price: target && Number.isFinite(horizonPrice) ? horizonPrice : null,
    horizon_observed_at: target?.observed_at || target?.date || null,
    forward_return_pct: forwardReturn,
    outcome: forwardReturn == null ? 'pending' : forwardReturn > 0 ? 'positive' : forwardReturn < 0 ? 'negative' : 'flat'
  };
}

function summarizePortfolioHoldings(transactions = [], prices = new Map()) {
  const byStock = new Map();
  for (const tx of transactions) {
    const key = tx.stock_id;
    const current = byStock.get(key) || { stock_id: key, symbol: tx.Stock?.code, name: tx.Stock?.name, quantity: 0, cost: 0, realized_pnl: 0, first_traded_at: tx.traded_at, last_traded_at: tx.traded_at };
    const quantity = Number(tx.quantity); const price = normalizeTransactionPrice(tx.price); const fees = Number(tx.fees || 0);
    if (tx.side === 'BUY') { current.cost += quantity * price + fees; current.quantity += quantity; }
    else if (tx.side === 'SELL') { const average = current.quantity ? current.cost / current.quantity : 0; current.realized_pnl += quantity * (price - average) - fees; current.cost -= quantity * average; current.quantity -= quantity; }
    current.last_traded_at = tx.traded_at;
    byStock.set(key, current);
  }
  return [...byStock.values()].map(item => {
    const isOpen = item.quantity > 1e-8;
    const marketPrice = prices.get(item.stock_id) ?? null; const marketValue = marketPrice == null ? null : item.quantity * marketPrice;
    return { ...item, status: isOpen ? 'open' : 'closed', quantity: isOpen ? item.quantity : 0, cost: isOpen ? item.cost : 0, avg_cost: isOpen ? item.cost / item.quantity : 0, market_price: isOpen ? marketPrice : null, market_value: isOpen ? marketValue : null, unrealized_pnl: isOpen && marketValue != null ? marketValue - item.cost : null, closed_at: isOpen ? null : item.last_traded_at };
  });
}

function summarizePortfolioTransactions(transactions = [], prices = new Map()) {
  return summarizePortfolioHoldings(transactions, prices).filter(item => item.status === 'open');
}

module.exports = { normalizeTransactionPrice, normalizeRecommendationContext, vietnamTradingDate, uniqueForwardSessions, evaluateRecommendationEntry, summarizePortfolioHoldings, summarizePortfolioTransactions };
