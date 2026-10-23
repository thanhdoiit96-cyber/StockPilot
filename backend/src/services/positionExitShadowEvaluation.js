'use strict';

const { sessionDate, uniqueDailyRows } = require('./positionExitGuidance');

const HORIZONS = [1, 5, 20];
const number = value => value == null || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;
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

function evaluatePositionExitHorizon({ guidance = {}, priceRows = [], horizonDays } = {}) {
  if (!HORIZONS.includes(horizonDays)) throw new Error('horizonDays must be 1, 5 or 20');
  const base = { version: 'position_exit_shadow_evaluation_v2', horizon_days: horizonDays };
  const excluded = reason => ({ ...base, status: 'excluded', reason });
  const asOf = guidance.as_of;
  if (typeof asOf !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(asOf) || !Number.isFinite(Date.parse(asOf)) || new Date(asOf).toISOString().slice(0, 10) !== asOf) return excluded('invalid_signal_date');
  if (guidance.version !== 'position_exit_rule_v1' || guidance.research_only !== true || !['hold', 'cut_loss', 'trailing_protect', 'take_profit_review'].includes(guidance.status)) return excluded('guidance_unavailable_or_unsupported');
  const basis = guidance.price_basis;
  if (!guidance.provider || !basis?.price_unit || !basis?.currency || typeof basis.is_adjusted !== 'boolean' || !Number.isFinite(Number(guidance.reference?.close)) || !(Number(guidance.reference?.close) > 0)) return excluded('invalid_frozen_guidance');
  const rows = uniqueDailyRows(priceRows).filter(row => row.session_date > asOf).slice(0, horizonDays);
  if (rows.some(row => row.provider !== guidance.provider || row.interval !== '1d' || row.price_unit !== basis.price_unit || row.currency !== basis.currency || row.is_adjusted !== basis.is_adjusted)) return excluded('mixed_price_basis');
  if (rows.length < horizonDays) return { ...base, status: 'pending', as_of: asOf, coverage: { observed_subsequent_sessions: rows.length, required_sessions: horizonDays } };
  const result = evaluatePositionExitGuidance({ guidance, priceRows: rows });
  return { ...result, ...base, status: 'evaluated', coverage: { observed_subsequent_sessions: rows.length, required_sessions: horizonDays },
    observations: { [String(horizonDays)]: result.observations[String(horizonDays)] },
    excursion: { mae_pct: Math.min(0, result.excursion.mae_pct), mfe_pct: Math.max(0, result.excursion.mfe_pct), basis: 'close' } };
}

module.exports = { HORIZONS, evaluatePositionExitGuidance, evaluatePositionExitHorizon };
