const { buildShortTermRecommendations, buildEvidenceProfile, buildPersonalizedRecommendations, evaluateRecommendations, scoreAnalysis } = require('./recommendationEngine');
const { analyzePrices } = require('./technicalAnalysis');

function rows(start = 100) { return Array.from({ length: 70 }, (_, index) => { const date = new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10); return { observed_at: date, close: start + index, price: start + index }; }); }

test('ranks short-term candidates and caps the result set', () => {
  const selected = buildShortTermRecommendations({ stocks: [{ id: 'a', code: 'AAA', name: 'A', industry: 'Technology' }, { id: 'b', code: 'BBB', name: 'B' }], priceRowsByStock: new Map([['a', rows()], ['b', rows(80)]]), limit: 1, asOf: '2026-03-11T00:00:00.000Z' });
  expect(selected).toHaveLength(1);
  expect(selected[0]).toMatchObject({ rank: 1, symbol: 'AAA', horizon_days: 20 });
  expect(selected[0].rationale.reference_plan).toMatchObject({ buy_price: 169, sell_price: 177.45, horizon_days: 20 });
  expect(selected[0].rationale.technical_confirmation).toHaveProperty('ichimoku');
  expect(selected[0].rationale.technical_confirmation).toHaveProperty('macd');
  expect(selected[0].rationale.snapshot_taxonomy).toEqual({ industry: 'Technology', source: 'stocks.industry', captured_at: '2026-03-11T00:00:00.000Z' });
});

test('personalized ranking responds to user criterion weights and returns explainable score parts', () => {
  const stocks = [{ id: 'a', code: 'AAA', name: 'A' }, { id: 'b', code: 'BBB', name: 'B' }];
  const priceRowsByStock = new Map([['a', rows()], ['b', rows(80)]]);
  const trendFirst = buildPersonalizedRecommendations({ stocks, priceRowsByStock, criteria: { trend: 60, momentum: 0, rsi: 0, stability: 0, liquidity: 0 } });
  const rsiFirst = buildPersonalizedRecommendations({ stocks, priceRowsByStock, criteria: { trend: 0, momentum: 0, rsi: 60, stability: 0, liquidity: 0 } });
  expect(trendFirst[0].rationale.score_parts).toHaveProperty('trend');
  expect(rsiFirst[0].rationale.weights.rsi).toBe(60);
  expect(trendFirst.find(item => item.symbol === 'AAA').score).toBeGreaterThan(rsiFirst.find(item => item.symbol === 'AAA').score);
});

test('evaluates realized forward return without inventing missing data', () => {
  const recommendation = { stock_id: 'a', entry_price: 100, horizon_days: 2 };
  const priceRowsByStock = new Map([
    ['a', [
      { observed_at: '2026-01-02', close: 101 },
      { observed_at: '2026-01-03', close: 105 }
    ]]
  ]);
  const result = evaluateRecommendations({ recommendations: [recommendation], asOf: new Date('2026-01-01'), priceRowsByStock });
  expect(result[0]).toMatchObject({ outcome: 'positive', forward_return_pct: 5 });
});

test('keeps objective, subjective, sentiment and news evidence explicit', () => {
  const profile = buildEvidenceProfile({ analysis: { observations: 60, indicators: {} }, externalFactors: [{ status: 'verified', source: 'World Bank', published_at: '2026-01-01' }], news: [{ status: 'verified', sentiment: 'positive' }, { status: 'unverified', sentiment: 'negative' }] });
  expect(profile).toMatchObject({ objective: { status: 'available' }, macro: { status: 'available', verified_count: 1 }, news: { status: 'available', positive_count: 1, negative_count: 0 }, sentiment: { status: 'unavailable' }, subjective: { status: 'unavailable' } });
  expect(profile.policy.unverified_news_excluded).toBe(true);
});

test('carries verified external context into recommendation snapshots without scoring it', () => {
  const baseline = buildShortTermRecommendations({ stocks: [{ id: 'a', code: 'AAA', name: 'A' }], priceRowsByStock: new Map([['a', rows()]]) });
  const selected = buildShortTermRecommendations({
    stocks: [{ id: 'a', code: 'AAA', name: 'A' }],
    priceRowsByStock: new Map([['a', rows()]]),
    externalFactorsByStock: new Map([['AAA', [
      { type: 'macro', status: 'verified', source: 'World Bank', source_url: 'https://worldbank.example/report', title: 'Macro report', published_at: '2026-01-01' },
      { type: 'news', status: 'verified', source: 'Wire', source_url: 'https://wire.example/fpt', title: 'FPT update', published_at: '2026-01-02', impact: 'positive' },
      { type: 'news', status: 'unverified', source: 'Blog', source_url: 'https://blog.example/fpt', published_at: '2026-01-03', impact: 'negative' },
      { type: 'news', status: 'verified', source: 'Unsafe', source_url: 'javascript:alert(1)', published_at: '2026-01-04', impact: 'neutral' }
    ]]])
  });
  expect(selected[0].rationale.evidence).toMatchObject({ macro: { status: 'available', verified_count: 1 }, news: { status: 'available', positive_count: 1, negative_count: 0 }, sentiment: { status: 'unavailable' } });
  expect(selected[0].rationale.evidence.sources).toEqual([
    expect.objectContaining({ type: 'macro', source: 'World Bank', source_url: 'https://worldbank.example/report' }),
    expect.objectContaining({ type: 'news', source: 'Wire', source_url: 'https://wire.example/fpt' })
  ]);
  expect(selected[0].score).toBe(baseline[0].score);
});

test('uses current intraday quote as recommendation reference price when available', () => {
  const result = buildPersonalizedRecommendations({
    stocks: [{ id: 'a', code: 'AAA', name: 'A' }],
    priceRowsByStock: new Map([['a', rows()]]),
    currentQuotes: new Map([['AAA', { price: 142, observed_at: '2026-09-24T04:00:00.000Z' }]])
  });
  expect(result[0].entry_price).toBe(142);
  expect(result[0].rationale.reference_plan).toMatchObject({ buy_price: 142, price_source: 'intraday', observed_at: '2026-09-24T04:00:00.000Z' });
  expect(result[0].rationale.technical_confirmation).toHaveProperty('bollinger');
});

test('uses Ichimoku cloud confirmation in recommendation scoring', () => {
  const above = analyzePrices(rows().map(row => ({ ...row })));
  const below = analyzePrices(rows().map((row, index) => ({ ...row, close: 200 - index })));
  expect(above.indicators.ichimoku.cloud).toBe('above_cloud');
  expect(below.indicators.ichimoku.cloud).toBe('below_cloud');
  expect(scoreAnalysis(above)).toBeGreaterThan(scoreAnalysis(below));
});
