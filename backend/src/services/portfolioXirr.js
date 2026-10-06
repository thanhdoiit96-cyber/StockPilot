'use strict';

const { vietnamTradingDate } = require('./portfolioAccounting');

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_LOG_FACTOR = Math.log(0.0001);
const MAX_LOG_FACTOR = Math.log(10000);
const SCAN_STEPS = 2048;

function dateDay(value) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : vietnamTradingDate(value);
  const time = date ? Date.parse(`${date}T00:00:00Z`) : NaN;
  return Number.isFinite(time) ? { date, time } : null;
}

function aggregateInvestorCashFlows(cashFlows, terminalValue, terminalDate) {
  const terminal = dateDay(terminalDate);
  if (!terminal || !Number.isFinite(Number(terminalValue)) || Number(terminalValue) < 0) return { error: 'invalid_terminal_value' };
  const byDate = new Map();
  for (const input of cashFlows) {
    const row = input?.toJSON ? input.toJSON() : input;
    const day = dateDay(row.occurred_at);
    const amount = Number(row.amount);
    if (!day || !Number.isFinite(amount) || amount <= 0) return { error: 'invalid_external_cash_flow' };
    if (day.time > terminal.time) return { error: 'external_cash_flow_after_terminal' };
    const investorAmount = row.type === 'DEPOSIT' ? -amount : row.type === 'WITHDRAWAL' ? amount : NaN;
    if (!Number.isFinite(investorAmount)) return { error: 'invalid_external_cash_flow' };
    byDate.set(day.date, (byDate.get(day.date) || 0) + investorAmount);
  }
  byDate.set(terminal.date, (byDate.get(terminal.date) || 0) + Number(terminalValue));
  const entries = [...byDate.entries()].map(([date, amount]) => ({ date, time: dateDay(date).time, amount })).filter(row => Math.abs(row.amount) > 1e-8).sort((a, b) => a.time - b.time);
  if (!entries.length || !entries.some(row => row.amount < 0) || !entries.some(row => row.amount > 0)) return { error: 'insufficient_sign_change' };
  const origin = entries[0].time;
  return { entries: entries.map(row => ({ ...row, years: (row.time - origin) / DAY_MS / 365 })) };
}

function npvAtLogFactor(entries, logFactor) {
  return entries.reduce((sum, row) => sum + row.amount * Math.exp(-row.years * logFactor), 0);
}

function derivativeAtLogFactor(entries, logFactor) {
  return entries.reduce((sum, row) => sum - row.years * row.amount * Math.exp(-row.years * logFactor), 0);
}

function findRoots(entries) {
  const scale = entries.reduce((sum, row) => sum + Math.abs(row.amount), 0);
  const residualTolerance = Math.max(0.01, scale * 1e-10);
  const roots = [];
  const addRoot = logFactor => {
    if (!Number.isFinite(logFactor) || logFactor < MIN_LOG_FACTOR || logFactor > MAX_LOG_FACTOR) return;
    for (let iteration = 0; iteration < 30; iteration += 1) {
      const value = npvAtLogFactor(entries, logFactor); const derivative = derivativeAtLogFactor(entries, logFactor);
      if (!Number.isFinite(value) || !Number.isFinite(derivative) || Math.abs(derivative) < 1e-12) break;
      const next = logFactor - value / derivative;
      if (!Number.isFinite(next) || next < MIN_LOG_FACTOR || next > MAX_LOG_FACTOR) break;
      logFactor = next;
    }
    const residual = npvAtLogFactor(entries, logFactor);
    if (Math.abs(residual) > residualTolerance) return;
    const rate = Math.exp(logFactor) - 1;
    if (!roots.some(root => Math.abs(root.rate - rate) <= 1e-7 * Math.max(1, Math.abs(rate)))) roots.push({ rate, residual });
  };
  let left = MIN_LOG_FACTOR; let leftValue = npvAtLogFactor(entries, left);
  for (let index = 1; index <= SCAN_STEPS; index += 1) {
    const right = MIN_LOG_FACTOR + (MAX_LOG_FACTOR - MIN_LOG_FACTOR) * index / SCAN_STEPS;
    const rightValue = npvAtLogFactor(entries, right);
    if (Math.abs(leftValue) <= residualTolerance) addRoot(left);
    if (leftValue * rightValue < 0) {
      let low = left; let high = right; let lowValue = leftValue;
      for (let iteration = 0; iteration < 100 && high - low > 1e-14; iteration += 1) {
        const middle = (low + high) / 2; const middleValue = npvAtLogFactor(entries, middle);
        if (lowValue * middleValue <= 0) high = middle;
        else { low = middle; lowValue = middleValue; }
      }
      addRoot((low + high) / 2);
    }
    left = right; leftValue = rightValue;
  }
  addRoot(MAX_LOG_FACTOR);
  for (let seed = 0; seed <= 64; seed += 1) {
    let candidate = MIN_LOG_FACTOR + (MAX_LOG_FACTOR - MIN_LOG_FACTOR) * seed / 64;
    for (let iteration = 0; iteration < 50; iteration += 1) {
      const value = npvAtLogFactor(entries, candidate); const derivative = derivativeAtLogFactor(entries, candidate);
      if (!Number.isFinite(value) || !Number.isFinite(derivative) || Math.abs(derivative) < 1e-12) break;
      const next = candidate - value / derivative;
      if (!Number.isFinite(next) || next < MIN_LOG_FACTOR || next > MAX_LOG_FACTOR) break;
      if (Math.abs(next - candidate) < 1e-12) { candidate = next; break; }
      candidate = next;
    }
    addRoot(candidate);
  }
  return roots.sort((a, b) => a.rate - b.rate);
}

function calculatePortfolioXirr({ cashFlows = [], terminalValue, terminalDate, valuationComplete = false } = {}) {
  const base = { methodology: 'xirr_actual_365_v1', scope: 'inception_to_terminal', annualized_mwr_pct: null, terminal_date: terminalDate || null, roots_pct: [], npv_residual: null };
  if (!valuationComplete) return { ...base, status: 'unavailable', reason: 'partial_valuation' };
  const aggregated = aggregateInvestorCashFlows(cashFlows, terminalValue, terminalDate);
  if (aggregated.error) return { ...base, status: 'unavailable', reason: aggregated.error };
  const roots = findRoots(aggregated.entries);
  const rootsPct = roots.map(root => Number((root.rate * 100).toFixed(6)));
  if (!roots.length) return { ...base, status: 'no_root', reason: 'no_rate_in_supported_domain', roots_pct: [] };
  if (roots.length > 1) return { ...base, status: 'multiple_roots', reason: 'ambiguous_cash_flow_pattern', roots_pct: rootsPct };
  return { ...base, status: 'available', reason: null, annualized_mwr_pct: rootsPct[0], roots_pct: rootsPct, npv_residual: Number(roots[0].residual.toFixed(6)) };
}

module.exports = { aggregateInvestorCashFlows, calculatePortfolioXirr, findRoots, npvAtLogFactor };
