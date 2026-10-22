'use strict';

const sessionDate = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
};
const number = value => Number.isFinite(Number(value)) ? Number(value) : null;
const average = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

function uniqueDailyRows(rows = []) {
  const sessions = new Map();
  for (const source of rows) {
    const date = sessionDate(source?.observed_at || source?.date);
    const close = number(source?.close ?? source?.price);
    if (!date || close == null || close <= 0) continue;
    const current = sessions.get(date);
    const currentTime = current ? new Date(current.observed_at || current.date).getTime() : -Infinity;
    const sourceTime = new Date(source.observed_at || source.date).getTime();
    if (!current || sourceTime >= currentTime) sessions.set(date, { ...source, session_date: date, close });
  }
  return [...sessions.values()].sort((a, b) => a.session_date.localeCompare(b.session_date));
}

function rsi14(closes) {
  if (closes.length < 15) return null;
  const changes = closes.slice(-15).slice(1).map((close, index) => close - closes.slice(-15)[index]);
  const gains = average(changes.map(value => Math.max(0, value)));
  const losses = average(changes.map(value => Math.max(0, -value)));
  if (losses === 0) return 100;
  return Number((100 - 100 / (1 + gains / losses)).toFixed(4));
}

function atr14(rows) {
  if (rows.length < 15) return null;
  const values = [];
  for (let index = rows.length - 14; index < rows.length; index += 1) {
    const row = rows[index]; const previous = rows[index - 1]?.close;
    const high = number(row.high) ?? row.close; const low = number(row.low) ?? row.close;
    if (previous == null || high <= 0 || low <= 0) return null;
    values.push(Math.max(high - low, Math.abs(high - previous), Math.abs(low - previous)));
  }
  return Number(average(values).toFixed(6));
}

function unavailable(reason, details = {}) {
  return { version: 'position_exit_rule_v1', status: 'unavailable', research_only: true, reason, ...details };
}

function buildPositionExitGuidance({ position = {}, priceRows = [], hasUnappliedCorporateAction = false, minimumSessions = 60 } = {}) {
  const averageCost = number(position.avg_cost);
  const quantity = number(position.quantity);
  if (!averageCost || averageCost <= 0 || !quantity || quantity <= 0) return unavailable('position_cost_or_quantity_invalid');
  if (hasUnappliedCorporateAction) return unavailable('unapplied_corporate_action');
  const rows = uniqueDailyRows(priceRows);
  if (rows.length < minimumSessions) return unavailable('insufficient_eod_sessions', { coverage: { observed: rows.length, minimum: minimumSessions } });
  const latest = rows.at(-1);
  const provider = latest.provider || null;
  const priceUnit = latest.price_unit || null;
  const currency = latest.currency || null;
  const adjusted = latest.is_adjusted;
  if (!provider || !priceUnit) return unavailable('missing_price_provenance', { as_of: latest.session_date });
  if (rows.some(row => row.provider !== provider || row.price_unit !== priceUnit || (row.currency || null) !== currency || row.is_adjusted !== adjusted)) return unavailable('mixed_price_basis', { as_of: latest.session_date });
  const atr = atr14(rows);
  const closes = rows.map(row => row.close);
  const rsi = rsi14(closes);
  const sma20 = average(closes.slice(-20));
  const sma50 = average(closes.slice(-50));
  if (atr == null || rsi == null || sma20 == null || sma50 == null) return unavailable('insufficient_indicator_history', { as_of: latest.session_date });
  const effectiveEntryDate = sessionDate(position.first_traded_at) || rows[0].session_date;
  const sinceEntry = rows.filter(row => row.session_date >= effectiveEntryDate);
  if (!sinceEntry.length) return unavailable('entry_after_available_eod', { as_of: latest.session_date });
  const highestSinceEntry = Math.max(...sinceEntry.map(row => row.close));
  const initialStop = averageCost - 2 * atr;
  const profitArmed = highestSinceEntry >= averageCost + 2 * atr;
  const trailingStop = profitArmed ? Math.max(averageCost, highestSinceEntry - 3 * atr) : initialStop;
  const target = averageCost + 3 * atr;
  const close = latest.close;
  const bearishTrend = close < sma20 && sma20 < sma50;
  const priorRsi = rsi14(closes.slice(0, -1));
  const momentumWeakening = (priorRsi != null && priorRsi >= 70 && rsi < 70) || bearishTrend;
  let status = 'hold'; let reasons = ['no_exit_trigger'];
  if (close <= trailingStop) { status = 'cut_loss'; reasons = ['close_at_or_below_active_stop']; }
  else if (profitArmed && (close - trailingStop) <= .5 * atr) { status = 'trailing_protect'; reasons = ['trailing_stop_armed', 'close_near_active_stop']; }
  else if (close >= target && momentumWeakening) { status = 'take_profit_review'; reasons = ['profit_target_reached', bearishTrend ? 'trend_weakened' : 'rsi_left_overbought']; }
  return {
    version: 'position_exit_rule_v1', status, research_only: true, as_of: latest.session_date,
    provider, interval: latest.interval || '1d', price_basis: { price_unit: priceUnit, currency, is_adjusted: adjusted },
    position: { stock_id: position.stock_id || null, symbol: position.symbol || null, quantity, average_cost: averageCost, effective_entry_date: effectiveEntryDate },
    reference: { close, highest_close_since_entry: Number(highestSinceEntry.toFixed(6)) },
    levels: { initial_stop: Number(initialStop.toFixed(6)), active_stop: Number(trailingStop.toFixed(6)), take_profit_review: Number(target.toFixed(6)), trailing_armed: profitArmed },
    indicators: { atr14: atr, rsi14: rsi, sma20: Number(sma20.toFixed(6)), sma50: Number(sma50.toFixed(6)), bearish_trend: bearishTrend },
    coverage: { observed: rows.length, minimum: minimumSessions }, reasons
  };
}

module.exports = { buildPositionExitGuidance, uniqueDailyRows, atr14, rsi14, sessionDate };
