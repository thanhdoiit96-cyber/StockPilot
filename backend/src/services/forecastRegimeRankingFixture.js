'use strict';
// Extended synthetic fixture for ranking evaluation only. Regime blocks are
// pre-specified and are not derived from evaluation outcomes.
function forecastRegimeRankingFixture() {
  const sessions = Array.from({ length: 140 }, (_, i) => new Date(Date.UTC(2025, 0, i + 1)).toISOString().slice(0, 10));
  const regimes = sessions.map((_, i) => ['advancing', 'balanced', 'declining'][Math.floor(i / 12) % 3]);
  const rows = [];
  for (let symbol = 0; symbol < 50; symbol++) {
    let close = 100 + symbol * .1;
    sessions.forEach((session, i) => {
      const regime = regimes[i];
      const common = regime === 'advancing' ? .008 : regime === 'declining' ? (symbol < 10 ? .009 : -.008) : (symbol % 2 ? .006 : -.004);
      const idiosyncratic = Math.sin(symbol * .47 + i * .31) * .002;
      close *= 1 + common + idiosyncratic;
      rows.push({ stock_id: String(symbol), session, available_at: session + 'T17:00:00+07:00', provider: 'ranking-fixture', interval: '1d', close,
        volume: 100000 + symbol * 1000 + i * 100, price_basis: 'fixture', basis_verified: true, events_verified: true });
    });
  }
  return { synthetic: true, provider: 'ranking-fixture', synthetic_design: { kind: 'pre_registered_regime_blocks_v1', block_sessions: 12, sequence: ['advancing', 'balanced', 'declining'], market_evidence: false },
    calendar: { verified: true, source: 'synthetic-ranking-calendar', version: 'ranking-fixture-v1', sessions }, rows,
    origins: sessions.slice(59, 135).map(asOf => ({ asOf, cutoff: asOf + 'T18:00:00+07:00' })),
    evaluationCutoffs: sessions.slice(60, 140).map(day => day + 'T19:00:00+07:00'),
    folds: [
      { testStart: sessions[80], testEnd: sessions[94], fitCutoff: sessions[79] + 'T23:00:00+07:00' },
      { testStart: sessions[100], testEnd: sessions[114], fitCutoff: sessions[99] + 'T23:00:00+07:00' },
      { testStart: sessions[120], testEnd: sessions[134], fitCutoff: sessions[119] + 'T23:00:00+07:00' }
    ] };
}
module.exports = { forecastRegimeRankingFixture };
