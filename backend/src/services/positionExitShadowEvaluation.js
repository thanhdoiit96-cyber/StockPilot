'use strict';

const { sessionDate, uniqueDailyRows } = require('./positionExitGuidance');

const HORIZONS = [1, 5, 20];
const number = value => Number.isFinite(Number(value)) ? Number(value) : null;
const normalizedSessionDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? value : sessionDate(value);

function evaluatePositionExitGuidance({ guidance = {}, priceRows = [] } = {}) {
  const asOf = normalizedSessionDate(guidance.as_of);
  const referenceClose = number(guidance?.reference?.close);
  if (!asOf || !referenceClose || referenceClose <= 0) return { status: 'excluded', reason: 'invalid_frozen_guidance' };
  const rows = uniqueDailyRows(priceRows).filter(row => row.session_date > asOf);
  const returns = rows.map(row => Number((((row.close / referenceClose) - 1) * 100).toFixed(6)));
  const activeStop = number(guidance?.levels?.active_stop);
  const target = number(guidance?.levels?.take_profit_review);
  const observations = Object.fromEntries(HORIZONS.map(horizon => {
    const row = rows[horizon - 1];
    return [String(horizon), row ? { session_date: row.session_date, close: row.close, return_pct: returns[horizon - 1] } : null];
  }));
  return {
    version: 'position_exit_shadow_evaluation_v1',
    status: rows.length >= 20 ? 'evaluated' : 'pending',
    as_of: asOf,
    coverage: { observed_subsequent_sessions: rows.length, required_sessions: 20 },
    observations,
    excursion: rows.length ? { mae_pct: Number(Math.min(...returns).toFixed(6)), mfe_pct: Number(Math.max(...returns).toFixed(6)) } : null,
    boundaries: {
      active_stop_crossed: activeStop == null ? null : rows.some(row => row.close <= activeStop),
      take_profit_review_crossed: target == null ? null : rows.some(row => row.close >= target)
    }
  };
}

module.exports = { HORIZONS, evaluatePositionExitGuidance };
