const { analyzePrices, buildTechnicalInsight, buildExternalFactorSummary, buildCombinedInsight, buildEvaluationFactors, buildHorizonAdvice, buildExpertGuidance } = require('./technicalAnalysis');

describe('technical analysis', () => {
  test('calculates deterministic indicators and transparent insight', () => {
    const rows = Array.from({ length: 60 }, (_, index) => ({ close: 100 + index, observed_at: `2026-01-${String(index + 1).padStart(2, '0')}` }));
    const analysis = analyzePrices(rows);
    expect(analysis.observations).toBe(60);
    expect(analysis.indicators.sma20).toBeCloseTo(149.5, 5);
    expect(analysis.indicators.ema12).toBeGreaterThan(140);
    expect(analysis.indicators.rsi14).toBe(100);
    expect(analysis.indicators.macd.state).toBe('neutral');
    expect(analysis.indicators.bollinger.position).toBe('upper_half');
    expect(analysis.trend).toBe('above_sma20');
    expect(buildTechnicalInsight(analysis).model).toBe('rule_based_technical_v1');
  });

  test('returns safe null indicators for insufficient data', () => {
    const analysis = analyzePrices([{ close: 100, observed_at: '2026-01-01' }]);
    expect(analysis.trend).toBe('insufficient_data');
    expect(analysis.indicators.sma20).toBeNull();
    expect(analysis.indicators.rsi14).toBeNull();
  });

  test('combines verified context with technical insight and exposes confidence', () => {
    const analysis = analyzePrices(Array.from({ length: 20 }, (_, index) => ({ close: 100 + index })));
    const insight = buildCombinedInsight(analysis, [{ status: 'verified' }]);
    expect(insight.model).toBe('rule_based_fusion_v1');
    expect(insight.context_count).toBe(1);
    expect(insight.confidence).toBe('limited');
  });

  test('does not treat unverified external factors as evidence', () => {
    const summary = buildExternalFactorSummary([{ type: 'news', source: 'unknown', status: 'unverified' }]);
    expect(summary.status).toBe('not_available');
    expect(summary.verified_count).toBe(0);
  });
  test('builds objective evaluation factors and horizon advice', () => {
    const analysis = analyzePrices(Array.from({ length: 60 }, (_, index) => ({ close: 100 + index })));
    const factors = buildEvaluationFactors(analysis, [{ status: 'verified', type: 'shareholder_meeting' }]);
    expect(factors.map(item => item.key)).toEqual(['market_expectation', 'financial_report', 'shareholder_meeting']);
    expect(factors.find(item => item.key === 'shareholder_meeting').status).toBe('verified');
    const advice = buildHorizonAdvice(analysis, { horizons: {} });
    expect(advice.short_term.advice).toContain('RSI');
    expect(advice.long_term.label).toBe('Dài hạn');
  });

  test('expert guidance exposes Ichimoku and actionable horizons', () => {
    const analysis = analyzePrices(Array.from({ length: 60 }, (_, index) => ({ close: 100 + index, observed_at: `2026-01-${String(index + 1).padStart(2, '0')}` })));
    const guidance = buildExpertGuidance(analysis, { disclaimer: 'x' });
    expect(analysis.indicators.ichimoku).toBeDefined();
    expect(analysis.indicators.ichimoku.cloud).toBe('above_cloud');
    expect(guidance.watch).toContain('Tenkan/Kijun và giá so với mây Ichimoku');
    expect(guidance.score_breakdown.map(item => item.key)).toEqual(['trend', 'ichimoku', 'macd', 'rsi', 'bollinger']);
    expect(guidance.technical_score).toBeGreaterThanOrEqual(0);
    expect(guidance.forecast.short_term).toContain('ngắn hạn');
    expect(guidance.risk_note).toBe('x');
  });

});

