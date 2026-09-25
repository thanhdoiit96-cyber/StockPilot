'use strict';
function average(values) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null; }
function stddev(values) { const mean = average(values); return values.length > 1 ? Math.sqrt(average(values.map(value => (value - mean) ** 2))) : null; }
function buildRiskPlan(rows, quality = {}) {
  const closes = rows.map(row => Number(row.close ?? row.price)).filter(Number.isFinite); const latest = closes.at(-1) ?? null;
  if (latest == null || closes.length < 20) return { status: 'insufficient_data', disclaimer: '\u0043\u1ea7n t\u1ed1i thi\u1ec3u 20 phi\u00ean gi\u00e1; c\u00e1c m\u1ee9c d\u01b0\u1edbi \u0111\u00e2y ch\u1ec9 l\u00e0 tham kh\u1ea3o.' };
  const window = closes.slice(-20); const volatility = (stddev(window) || 0) / latest; const support = Math.min(...window); const resistance = Math.max(...window);
  const stopLoss = Math.min(latest * (1 - Math.max(volatility * 1.5, 0.05)), latest * 0.99); const takeProfit = Math.max(latest * (1 + Math.max(volatility * 2, 0.08)), latest * 1.01);
  const baseWeight = quality.status === 'pass' ? 0.2 : quality.status === 'limited' ? 0.1 : 0;
  return { status: baseWeight ? 'available' : 'blocked', current_price: latest, support, resistance, volatility_20d: volatility, horizons: {
    short_term: { label: '\u004e\u0067\u1eaf\u006e h\u1ea1n (1\u20134 tu\u1ea7n)', stance: 'theo d\u00f5i xu h\u01b0\u1edbng', expectation_pct: { min: Number((-volatility * 100).toFixed(1)), max: Number((volatility * 100).toFixed(1)) }, allocation_pct: baseWeight * 100, take_profit: takeProfit, stop_loss: stopLoss },
    medium_term: { label: 'Trung h\u1ea1n (1\u20136 th\u00e1ng)', stance: 'ch\u1edd x\u00e1c nh\u1eadn xu h\u01b0\u1edbng', expectation_pct: { min: Number((-volatility * 100).toFixed(1)), max: Number((volatility * 300).toFixed(1)) }, allocation_pct: baseWeight * 150, take_profit: Math.max(latest * (1 + Math.max(volatility * 3, 0.15)), latest * 1.02), stop_loss: Math.min(latest * (1 - Math.max(volatility * 2, 0.1)), latest * 0.99) },
    long_term: { label: 'D\u00e0i h\u1ea1n (tr\u00ean 6 th\u00e1ng)', stance: 'ph\u00e2n b\u1ed5 t\u1eebng ph\u1ea7n', expectation_pct: { min: Number((-volatility * 200).toFixed(1)), max: Number((volatility * 600).toFixed(1)) }, allocation_pct: baseWeight * 250, take_profit: null, stop_loss: Math.min(latest * (1 - Math.max(volatility * 3, 0.15)), latest * 0.99) }
  }, allocation_basis: 'T\u1ef7 tr\u1ecdng tham kh\u1ea3o cho m\u1ed9t m\u00e3 trong danh m\u1ee5c.', disclaimer: 'M\u1ee9c ch\u1ed1t l\u1eddi v\u00e0 stop loss l\u00e0 m\u00f4 h\u00ecnh tham kh\u1ea3o, kh\u00f4ng ph\u1ea3i l\u1eddi khuy\u00ean c\u00e1 nh\u00e2n.' };
}
module.exports = { buildRiskPlan };
