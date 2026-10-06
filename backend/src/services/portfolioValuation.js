'use strict';

const { normalizeTransactionPrice, vietnamTradingDate } = require('./portfolioAccounting');

function asPlain(row) { return row?.toJSON ? row.toJSON() : row; }

function normalizeSessionLimit(value) { return Math.min(260, Math.max(2, Number.isFinite(Number(value)) ? Math.floor(Number(value)) : 30)); }

function buildDailyValuationSeries({ transactions = [], cashFlows = [], priceRows = [], sessionDates = [], sessions = 30 } = {}) {
  const boundedSessions = normalizeSessionLimit(sessions);
  const pricesByDate = new Map();
  for (const input of priceRows) {
    const row = asPlain(input);
    if (row.interval && !['1d', '1D', 'daily'].includes(String(row.interval))) continue;
    const date = vietnamTradingDate(row.observed_at || row.date);
    const price = Number(row.close ?? row.price);
    if (!date || !row.stock_id || !Number.isFinite(price) || price <= 0) continue;
    if (!pricesByDate.has(date)) pricesByDate.set(date, new Map());
    const existing = pricesByDate.get(date).get(String(row.stock_id));
    const observed = new Date(row.observed_at || row.date).getTime();
    if (!existing || observed > existing.observed || (observed === existing.observed && String(row.id || '') > String(existing.id || ''))) pricesByDate.get(date).set(String(row.stock_id), { price, observed, id: row.id });
  }
  const suppliedDates = sessionDates.map(value => String(value?.session_date || value)).filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value));
  const dates = [...new Set(suppliedDates.length ? suppliedDates : [...pricesByDate.keys()])].sort().slice(-boundedSessions);
  const events = [
    ...transactions.map(row => ({ kind: 'trade', date: vietnamTradingDate(row.traded_at), time: new Date(row.traded_at).getTime(), row: asPlain(row) })),
    ...cashFlows.map(row => ({ kind: 'cash_flow', date: vietnamTradingDate(row.occurred_at), time: new Date(row.occurred_at).getTime(), row: asPlain(row) }))
  ].filter(event => event.date && Number.isFinite(event.time)).sort((a, b) => a.time - b.time || (a.kind === 'cash_flow' ? -1 : 1));
  const holdings = new Map();
  let cash = 0; let eventIndex = 0; let previousValue = null; let cumulative = 1; let twrAvailable = true;
  const points = [];
  for (const date of dates) {
    let externalFlow = 0;
    while (eventIndex < events.length && events[eventIndex].date <= date) {
      const event = events[eventIndex++]; const row = event.row;
      if (event.kind === 'cash_flow') {
        const signed = (row.type === 'DEPOSIT' ? 1 : -1) * Number(row.amount || 0);
        cash += signed; if (event.date === date) externalFlow += signed;
      } else {
        const stockId = String(row.stock_id); const quantity = Number(row.quantity || 0); const price = normalizeTransactionPrice(row.price); const fees = Number(row.fees || 0);
        const signedQuantity = row.side === 'BUY' ? quantity : -quantity;
        holdings.set(stockId, (holdings.get(stockId) || 0) + signedQuantity);
        cash += row.side === 'BUY' ? -(quantity * price + fees) : quantity * price - fees;
      }
    }
    const active = [...holdings.entries()].filter(([, quantity]) => quantity > 1e-8);
    const dailyPrices = pricesByDate.get(date) || new Map();
    const missing = active.filter(([stockId]) => !dailyPrices.has(stockId)).map(([stockId]) => stockId);
    const marketValue = active.reduce((sum, [stockId, quantity]) => sum + (dailyPrices.get(stockId)?.price || 0) * quantity, 0);
    const cashDeficit = cash < -0.01;
    const complete = missing.length === 0 && !cashDeficit;
    const portfolioValue = complete ? cash + marketValue : null;
    let dailyReturnPct = null; let cumulativeReturnPct = null;
    if (previousValue != null && complete && twrAvailable) {
      const base = previousValue + externalFlow;
      if (base > 0) {
        const dailyReturn = portfolioValue / base - 1;
        cumulative *= 1 + dailyReturn;
        dailyReturnPct = Number((dailyReturn * 100).toFixed(6));
        cumulativeReturnPct = Number(((cumulative - 1) * 100).toFixed(6));
      } else twrAvailable = false;
    } else if (points.length && !complete) twrAvailable = false;
    points.push({ date, status: complete ? 'complete' : 'partial', portfolio_value: portfolioValue, market_value: missing.length ? null : marketValue, cash_balance: cash, external_cash_flow: externalFlow, open_positions: active.length, priced_positions: active.length - missing.length, missing_stock_ids: missing, daily_return_pct: dailyReturnPct, cumulative_twr_pct: cumulativeReturnPct });
    previousValue = complete ? portfolioValue : null;
  }
  const completePoints = points.filter(point => point.status === 'complete').length;
  const canPublishTwr = points.length >= 2 && completePoints === points.length && points.every(point => point.cash_balance >= -0.01) && points.some(point => point.daily_return_pct != null);
  if (!canPublishTwr) points.forEach(point => { point.daily_return_pct = null; point.cumulative_twr_pct = null; });
  return {
    status: points.length === 0 ? 'empty' : completePoints === points.length ? 'complete' : 'partial',
    methodology: 'daily_close_twr_v1',
    timezone: 'Asia/Ho_Chi_Minh',
    cash_flow_timing: 'beginning_of_session',
    requested_sessions: boundedSessions,
    coverage: { sessions: points.length, complete_sessions: completePoints, incomplete_sessions: points.length - completePoints },
    twr_available: canPublishTwr,
    cumulative_twr_pct: canPublishTwr ? points.at(-1).cumulative_twr_pct : null,
    points,
    limitations: ['exact_session_prices_required', 'dividends_not_tracked', 'corporate_actions_not_applied']
  };
}

module.exports = { normalizeSessionLimit, buildDailyValuationSeries };
