'use strict';
// Artificial calendar and prices. Never interpret this fixture as market evidence.
function forecastResearchFixture() {
  const sessions = Array.from({ length: 82 }, (_, i) => new Date(Date.UTC(2025, 0, i + 1)).toISOString().slice(0, 10));
  return { synthetic: true, provider: 'fixture', synthetic_design: { kind: 'multi_regime_sine_v1', intended_regimes: ['declining', 'balanced', 'advancing'], market_evidence: false }, calendar: { verified: true, source: 'synthetic-calendar', version: 'fixture-v1', sessions },
    rows: Array.from({ length: 50 }, (_, symbol) => sessions.map((session, i) => ({ stock_id: String(symbol), session, available_at: session + 'T17:00:00+07:00', provider: 'fixture', interval: '1d', close: 100 + Math.sin(i / 3 + symbol / 10) * 10, price_basis: 'fixture', basis_verified: true, events_verified: true }))).flat(),
    origins: sessions.slice(59, 77).map(asOf => ({ asOf, cutoff: asOf + 'T18:00:00+07:00' })),
    evaluationCutoffs: sessions.slice(60).map(day => day + 'T19:00:00+07:00'),
    folds: [{ testStart: sessions[70], testEnd: sessions[76], fitCutoff: sessions[69] + 'T23:00:00+07:00' }] };
}
module.exports = { forecastResearchFixture };
