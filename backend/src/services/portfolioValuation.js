'use strict';

const { normalizeTransactionPrice, vietnamTradingDate } = require('./portfolioAccounting');

function asPlain(row) { return row?.toJSON ? row.toJSON() : row; }

function normalizeSessionLimit(value) { return Math.min(260, Math.max(2, Number.isFinite(Number(value)) ? Math.floor(Number(value)) : 30)); }

function buildDailyValuationSeries({ transactions = [], cashFlows = [], portfolioEvents = [], priceRows = [], sessionDates = [], sessions = 30 } = {}) {
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
    ...cashFlows.map(row => ({ kind: 'cash_flow', date: vietnamTradingDate(row.occurred_at), time: new Date(row.occurred_at).getTime(), row: asPlain(row) })),
    ...portfolioEvents.map(input => {
      const row = asPlain(input); const actionDate = row.event_type === 'CASH_DIVIDEND' ? row.payment_date : row.effective_date;
      return { kind: 'portfolio_event', date: String(actionDate || ''), time: Date.parse(`${actionDate}T00:00:00+07:00`), row };
    })
  ].filter(event => event.date && Number.isFinite(event.time)).sort((a, b) => a.time - b.time || (a.kind === 'cash_flow' ? -1 : 1));
  const holdings = new Map();
  const costBasisByStock = new Map();
  let cash = 0; let eventIndex = 0; let previousValue = null; let cumulative = 1; let twrAvailable = true; let unresolvedEvent = false; const unresolvedEventIdsState = new Set();
  let appliedEvents = 0; let pendingEvents = 0; let unsupportedEvents = 0;
  const points = [];
  for (const date of dates) {
    let externalFlow = 0; let dividendIncome = 0; const unresolvedEventIds = []; const stockEventAdjustments = [];
    while (eventIndex < events.length && events[eventIndex].date <= date) {
      const event = events[eventIndex++]; const row = event.row;
      if (event.kind === 'cash_flow') {
        const signed = (row.type === 'DEPOSIT' ? 1 : -1) * Number(row.amount || 0);
        cash += signed; if (event.date === date) externalFlow += signed;
      } else if (event.kind === 'trade') {
        const stockId = String(row.stock_id); const quantity = Number(row.quantity || 0); const price = normalizeTransactionPrice(row.price); const fees = Number(row.fees || 0);
        const previousQuantity = holdings.get(stockId) || 0; const previousCost = costBasisByStock.get(stockId) || 0;
        const signedQuantity = row.side === 'BUY' ? quantity : -quantity;
        holdings.set(stockId, previousQuantity + signedQuantity);
        if (row.side === 'BUY') costBasisByStock.set(stockId, previousCost + quantity * price + fees);
        else costBasisByStock.set(stockId, Math.max(0, previousCost - (previousQuantity > 0 ? previousCost / previousQuantity * quantity : 0)));
        cash += row.side === 'BUY' ? -(quantity * price + fees) : quantity * price - fees;
      } else if (row.status === 'CONFIRMED' && row.event_type === 'CASH_DIVIDEND') {
        const amount = Number(row.payload?.net_cash_amount);
        if (Number.isFinite(amount) && amount >= 0) { cash += amount; dividendIncome += amount; appliedEvents += 1; }
        else { unresolvedEvent = true; unresolvedEventIdsState.add(row.id); unsupportedEvents += 1; }
      } else if (row.status === 'CONFIRMED' && ['STOCK_DIVIDEND', 'STOCK_SPLIT', 'RIGHTS_ISSUE'].includes(row.event_type)) {
        const stockId = String(row.stock_id); const beforeQuantity = holdings.get(stockId) || 0; const costBasis = costBasisByStock.get(stockId) || 0;
        const received = row.event_type === 'STOCK_DIVIDEND' ? Number(row.payload?.received_quantity) : null;
        const exercised = row.event_type === 'RIGHTS_ISSUE' ? Number(row.payload?.exercised_quantity) : null;
        const subscriptionPrice = row.event_type === 'RIGHTS_ISSUE' ? Number(row.payload?.subscription_price) : null;
        const exerciseCash = row.event_type === 'RIGHTS_ISSUE' ? Number(row.payload?.exercise_cash_amount) : 0;
        const numerator = Number(row.payload?.ratio_numerator); const denominator = Number(row.payload?.ratio_denominator);
        const afterQuantity = row.event_type === 'STOCK_DIVIDEND' ? beforeQuantity + received : row.event_type === 'RIGHTS_ISSUE' ? beforeQuantity + exercised : beforeQuantity * numerator / denominator;
        const afterCostBasis = row.event_type === 'RIGHTS_ISSUE' ? costBasis + exerciseCash : costBasis;
        const wholeShare = Number.isFinite(afterQuantity) && Math.abs(afterQuantity - Math.round(afterQuantity)) <= 1e-8;
        const valid = Number.isFinite(beforeQuantity) && beforeQuantity >= 0 && Number.isFinite(costBasis) && costBasis >= 0 && Number.isFinite(afterCostBasis) && afterCostBasis >= 0 && wholeShare && (row.event_type !== 'STOCK_DIVIDEND' || (Number.isFinite(received) && received >= 0)) && (row.event_type !== 'STOCK_SPLIT' || (Number.isFinite(numerator) && numerator > 0 && Number.isFinite(denominator) && denominator > 0)) && (row.event_type !== 'RIGHTS_ISSUE' || (Number.isFinite(exercised) && exercised >= 0 && Number.isFinite(subscriptionPrice) && subscriptionPrice >= 0 && Number.isFinite(exerciseCash) && exerciseCash >= 0 && Math.abs(exerciseCash - exercised * subscriptionPrice) <= 0.01));
        if (valid) {
          const normalizedQuantity = Math.round(afterQuantity);
          holdings.set(stockId, normalizedQuantity); costBasisByStock.set(stockId, afterCostBasis); cash -= exerciseCash; appliedEvents += 1;
          stockEventAdjustments.push({ event_id: row.id, event_type: row.event_type, stock_id: stockId, quantity_before: beforeQuantity, quantity_after: normalizedQuantity, cost_basis_before: costBasis, cost_basis_after: afterCostBasis, cash_change: exerciseCash === 0 ? 0 : -exerciseCash, average_cost_after: normalizedQuantity > 0 ? afterCostBasis / normalizedQuantity : null });
        } else { unresolvedEvent = true; unresolvedEventIdsState.add(row.id); unsupportedEvents += 1; }
      } else if (row.status === 'PENDING') {
        unresolvedEvent = true; unresolvedEventIdsState.add(row.id); pendingEvents += 1;
      } else if (row.status === 'CONFIRMED') {
        unresolvedEvent = true; unresolvedEventIdsState.add(row.id); unsupportedEvents += 1;
      }
    }
    const active = [...holdings.entries()].filter(([, quantity]) => quantity > 1e-8);
    const dailyPrices = pricesByDate.get(date) || new Map();
    const missing = active.filter(([stockId]) => !dailyPrices.has(stockId)).map(([stockId]) => stockId);
    const marketValue = active.reduce((sum, [stockId, quantity]) => sum + (dailyPrices.get(stockId)?.price || 0) * quantity, 0);
    const totalCostBasis = active.reduce((sum, [stockId]) => sum + Number(costBasisByStock.get(stockId) || 0), 0);
    const cashDeficit = cash < -0.01;
    const complete = missing.length === 0 && !cashDeficit && !unresolvedEvent;
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
    unresolvedEventIds.push(...unresolvedEventIdsState);
    points.push({ date, status: complete ? 'complete' : 'partial', portfolio_value: portfolioValue, market_value: missing.length ? null : marketValue, cash_balance: cash, total_cost_basis: totalCostBasis, external_cash_flow: externalFlow, dividend_income: dividendIncome, stock_event_adjustments: stockEventAdjustments, open_positions: active.length, priced_positions: active.length - missing.length, missing_stock_ids: missing, unresolved_event_ids: unresolvedEventIds, daily_return_pct: dailyReturnPct, cumulative_twr_pct: cumulativeReturnPct });
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
    event_coverage: { applied_events: appliedEvents, pending_events: pendingEvents, unsupported_events: unsupportedEvents },
    points,
    fractional_share_policy: 'whole_share_only_v1_cash_in_lieu_not_inferred',
    event_application_order: 'corporate_actions_before_same_day_trades',
    limitations: ['exact_session_prices_required', ...(pendingEvents ? ['pending_portfolio_events'] : []), ...(unsupportedEvents ? ['unsupported_or_fractional_portfolio_events'] : []), 'settlement_and_cash_in_lieu_not_verified']
  };
}

module.exports = { normalizeSessionLimit, buildDailyValuationSeries };
