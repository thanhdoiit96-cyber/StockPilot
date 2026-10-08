'use strict';

const { analyzePrices } = require('./technicalAnalysis');

function scoreAnalysis(analysis) {
  const indicators = analysis.indicators || {};
  const cloud = indicators.ichimoku?.cloud;
  let score = 0;
  if (analysis.trend === 'above_sma20') score += 30;
  if (indicators.ema12 != null && indicators.ema26 != null && indicators.ema12 > indicators.ema26) score += 20;
  if (indicators.rsi14 != null && indicators.rsi14 >= 45 && indicators.rsi14 <= 70) score += 15;
  if (indicators.momentum10 != null && indicators.momentum10 > 0) score += 20;
  if (analysis.observations >= 50) score += 15;
  if (cloud === 'above_cloud') score += 10;
  if (cloud === 'below_cloud') score -= 10;
  if (indicators.macd?.state === 'bullish') score += 5;
  if (indicators.macd?.state === 'bearish') score -= 5;
  if (indicators.bollinger?.position === 'above_upper') score -= 5;
  return Math.min(100, score);
}

function buildEvidenceProfile({ analysis = {}, externalFactors = [], sentiment = null, news = [], userContext = null } = {}) {
  const verifiedFactors = externalFactors.filter(item => item && item.status === 'verified' && item.source && item.published_at);
  const positiveNews = news.filter(item => item.status === 'verified' && item.sentiment === 'positive');
  const negativeNews = news.filter(item => item.status === 'verified' && item.sentiment === 'negative');
  const sources = [...verifiedFactors, ...news].filter(item => {
    if (!item || item.status !== 'verified' || !item.source || !item.published_at || Number.isNaN(Date.parse(item.published_at))) return false;
    try { return ['http:', 'https:'].includes(new URL(item.source_url).protocol); } catch (_) { return false; }
  }).filter((item, index, rows) => rows.findIndex(candidate => candidate.source_url === item.source_url) === index).slice(0, 10).map(item => ({
    type: item.type || 'external', source: item.source, title: item.title || item.summary || item.source,
    source_url: item.source_url, published_at: new Date(item.published_at).toISOString()
  }));
  return {
    objective: { status: analysis.observations >= 50 ? 'available' : 'insufficient', observations: analysis.observations || 0, technical_score: scoreAnalysis(analysis) },
    macro: { status: verifiedFactors.length ? 'available' : 'unavailable', verified_count: verifiedFactors.length },
    sentiment: { status: sentiment?.status === 'verified' ? 'available' : 'unavailable', score: sentiment?.status === 'verified' ? Number(sentiment.score) : null },
    news: { status: positiveNews.length || negativeNews.length ? 'available' : 'unavailable', positive_count: positiveNews.length, negative_count: negativeNews.length },
    subjective: { status: userContext ? 'provided' : 'unavailable', fields: userContext ? Object.keys(userContext).filter(key => ['risk_tolerance', 'holding_period_days', 'max_allocation_pct'].includes(key)) : [] },
    sources,
    policy: { unverified_news_excluded: true, unavailable_factors_do_not_receive_points: true, no_trade_execution: true }
  };
}

function buildReferencePlan(rows, analysis, horizonDays) {
  const latest = Number(rows.at(-1)?.close ?? rows.at(-1)?.price);
  if (!Number.isFinite(latest)) return null;
  const recent = rows.slice(-20).map(row => Number(row.close ?? row.price)).filter(Number.isFinite);
  const recentHigh = recent.length ? Math.max(...recent) : latest;
  const sellPrice = Number(Math.max(latest * 1.05, recentHigh).toFixed(2));
  return { buy_price: Number(latest.toFixed(2)), sell_price: sellPrice, horizon_days: horizonDays, valid_until_sessions: horizonDays, methodology: 'latest_close_plus_5pct_or_20_session_high', disclaimer: 'Giá tham khảo để nghiên cứu; không phải lệnh giao dịch.' };
}

function snapshotTaxonomy(stock, asOf) {
  const industry = typeof stock?.industry === 'string' && stock.industry.trim() ? stock.industry.trim().slice(0, 120) : null;
  return { industry, source: 'stocks.industry', captured_at: new Date(asOf).toISOString() };
}

function buildShortTermRecommendations({ stocks = [], priceRowsByStock = new Map(), externalFactorsByStock = new Map(), sentimentByStock = new Map(), userContextByStock = new Map(), currentQuotes = new Map(), limit = 5, horizonDays = 20, asOf = new Date() } = {}) {
  const candidates = [];
  const criterionScores = new Map(buildPersonalizedRecommendations({ stocks, priceRowsByStock, criteria: DEFAULT_CRITERIA, limit: 30 }).map(item => [item.stock_id, item.rationale.score_parts]));
  for (const stock of stocks) {
    const rows = priceRowsByStock.get(stock.id) || [];
    const analysis = analyzePrices(rows);
    if (analysis.observations < 50) continue;
    const score = scoreAnalysis(analysis);
    if (score < 40) continue;
    const latest = rows.at(-1);
    const factors = externalFactorsByStock.get(stock.code) || [];
    const macro = factors.filter(item => item.type !== 'news');
    const news = factors.filter(item => item.type === 'news').map(item => ({ ...item, sentiment: item.sentiment || item.impact }));
    const evidence = buildEvidenceProfile({ analysis, externalFactors: macro, news, sentiment: sentimentByStock.get(stock.code), userContext: userContextByStock.get(stock.code) });
    const quote = currentQuotes instanceof Map ? currentQuotes.get(stock.code) : currentQuotes?.[stock.code];
    const intradayPrice = Number(quote?.price);
    const eodPrice = Number(latest?.close ?? latest?.price);
    const entryPrice = Number.isFinite(intradayPrice) && intradayPrice > 0 ? intradayPrice : Number.isFinite(eodPrice) && eodPrice > 0 ? eodPrice : null;
    const referencePlan = buildReferencePlan(rows, analysis, horizonDays);
    if (referencePlan) { referencePlan.buy_price = entryPrice; referencePlan.price_source = Number.isFinite(intradayPrice) && intradayPrice > 0 ? 'intraday' : 'eod'; referencePlan.observed_at = quote?.observed_at || latest?.observed_at || latest?.date || null; }
    candidates.push({ stock_id: stock.id, symbol: stock.code, name: stock.name, rank: 0, score, horizon_days: horizonDays, entry_price: entryPrice, rationale: { reference_plan: referencePlan, model: 'short_term_rule_v2', trend: analysis.trend, indicators: analysis.indicators, technical_score: score, technical_confirmation: { ichimoku: analysis.indicators.ichimoku?.cloud || "insufficient_data", macd: analysis.indicators.macd?.state || "insufficient_data", bollinger: analysis.indicators.bollinger?.position || "insufficient_data" }, score_parts: criterionScores.get(stock.id) || null, evidence, factors: ['Lịch sử giá đủ dài', 'Động lượng và xu hướng được kiểm tra', 'Vĩ mô/tin tức/tâm lý chưa được cộng điểm khi thiếu nguồn xác minh', 'Điểm xếp hạng không phải khuyến nghị mua bán'] }, as_of: asOf });
  }
  const stockById = new Map(stocks.map(stock => [String(stock.id), stock]));
  for (const candidate of candidates) candidate.rationale.snapshot_taxonomy = snapshotTaxonomy(stockById.get(String(candidate.stock_id)), asOf);
  return candidates.sort((a, b) => b.score - a.score || a.symbol.localeCompare(b.symbol)).slice(0, limit).map((item, index) => ({ ...item, rank: index + 1 }));
}

function evaluateRecommendations({ recommendations = [], priceRowsByStock = new Map(), asOf = new Date() } = {}) {
  return recommendations.map(item => {
    const rows = (priceRowsByStock.get(item.stock_id) || []).filter(row => new Date(row.observed_at || row.date) > new Date(asOf)).sort((a, b) => new Date(a.observed_at || a.date) - new Date(b.observed_at || b.date));
    const target = rows[item.horizon_days - 1] || rows.at(-1);
    if (!target || item.entry_price == null) return { ...item, outcome: 'pending', evaluated_at: null, forward_return_pct: null };
    const exit = Number(target.close ?? target.price);
    const forwardReturn = Number((((exit / Number(item.entry_price)) - 1) * 100).toFixed(4));
    return { ...item, outcome: forwardReturn > 0 ? 'positive' : forwardReturn < 0 ? 'negative' : 'flat', evaluated_at: target.observed_at || target.date, forward_return_pct: forwardReturn };
  });
}

const DEFAULT_CRITERIA = { trend: 30, momentum: 25, rsi: 15, stability: 15, liquidity: 15 };

function buildPersonalizedRecommendations({ stocks = [], priceRowsByStock = new Map(), criteria = {}, limit = 10, horizonDays = 20, calibration = {}, currentQuotes = new Map() } = {}) {
  const weights = Object.fromEntries(Object.keys(DEFAULT_CRITERIA).map(key => [key, Math.max(0, Math.min(100, Number(criteria[key] ?? DEFAULT_CRITERIA[key]) || 0))]));
  const weightTotal = Object.values(weights).reduce((sum, value) => sum + value, 0) || 1;
  const candidates = [];
  for (const stock of stocks) {
    const rows = priceRowsByStock.get(stock.id) || [];
    const analysis = analyzePrices(rows);
    if (analysis.observations < 50) continue;
    const closes = rows.map(row => Number(row.close ?? row.price)).filter(Number.isFinite);
    const returns = closes.slice(-21).slice(1).map((value, index) => (value / closes.slice(-21)[index] - 1) * 100).filter(Number.isFinite);
    const momentumPct = closes.length > 10 ? (closes.at(-1) / closes.at(-11) - 1) * 100 : 0;
    const dailyVolatility = returns.length > 1 ? Math.sqrt(returns.reduce((sum, value) => sum + (value - returns.reduce((a, b) => a + b, 0) / returns.length) ** 2, 0) / returns.length) : 0;
    const volumes = rows.slice(-20).map(row => Number(row.volume)).filter(value => Number.isFinite(value) && value > 0);
    const averageVolume = volumes.length ? volumes.reduce((sum, value) => sum + value, 0) / volumes.length : null;
    candidates.push({ stock, rows, analysis, momentumPct, dailyVolatility, averageVolume });
  }
  const volumeValues = candidates.map(item => item.averageVolume).filter(Number.isFinite).sort((a, b) => a - b);
  const scorePart = (key, item) => {
    if (key === 'trend') {
      const cloud = item.analysis.indicators?.ichimoku?.cloud;
      const macdState = item.analysis.indicators?.macd?.state;
      if (item.analysis.trend === 'above_sma20' && cloud === 'above_cloud' && macdState === 'bullish') return 100;
      if (item.analysis.trend === 'above_sma20' && cloud === 'above_cloud') return 90;
      if (item.analysis.trend === 'above_sma20') return macdState === 'bearish' ? 55 : 75;
      if (cloud === 'above_cloud' || macdState === 'bullish') return 60;
      return 0;
    }
    if (key === 'momentum') return Math.max(0, Math.min(100, 50 + item.momentumPct * 8));
    if (key === 'rsi') { const rsi = item.analysis.indicators.rsi14; return rsi == null ? 0 : Math.max(0, 100 - Math.abs(rsi - 55) * 2.2); }
    if (key === 'stability') return Math.max(0, 100 - item.dailyVolatility * 20);
    if (key === 'liquidity') return item.averageVolume == null ? 0 : (volumeValues.filter(value => value <= item.averageVolume).length / Math.max(1, volumeValues.length)) * 100;
    return 0;
  };
  return candidates.map(item => {
    const parts = Object.fromEntries(Object.keys(weights).map(key => [key, Number(scorePart(key, item).toFixed(1))]));
    const factors = Object.keys(weights).map(key => ({ key, score: parts[key], weight: weights[key], calibration: Number(calibration[key] || 1) }));
    const weightedTotal = factors.reduce((sum, factor) => sum + factor.score * factor.weight * factor.calibration, 0);
    const effectiveWeight = factors.reduce((sum, factor) => sum + factor.weight * factor.calibration, 0) || 1;
    const score = Number((weightedTotal / effectiveWeight).toFixed(1));
    const latest = item.rows.at(-1);
    const quote = currentQuotes instanceof Map ? currentQuotes.get(item.stock.code) : currentQuotes?.[item.stock.code];
    const intradayPrice = Number(quote?.price);
    const eodPrice = Number(latest?.close ?? latest?.price);
    const entryPrice = Number.isFinite(intradayPrice) && intradayPrice > 0 ? intradayPrice : Number.isFinite(eodPrice) && eodPrice > 0 ? eodPrice : null;
    const priceSource = Number.isFinite(intradayPrice) && intradayPrice > 0 ? 'intraday' : 'eod';
    return { stock_id: item.stock.id, symbol: item.stock.code, name: item.stock.name, score, rank: 0, horizon_days: horizonDays, entry_price: entryPrice, rationale: { model: 'personalized_rule_v1', score_parts: parts, weights, calibration, volatility_pct: Number(item.dailyVolatility.toFixed(3)), average_volume: item.averageVolume, observations: item.analysis.observations, indicators: item.analysis.indicators, technical_score: scoreAnalysis(item.analysis), technical_confirmation: { ichimoku: item.analysis.indicators.ichimoku?.cloud || "insufficient_data", macd: item.analysis.indicators.macd?.state || "insufficient_data", bollinger: item.analysis.indicators.bollinger?.position || "insufficient_data" }, trend: item.analysis.trend, reference_plan: { buy_price: entryPrice, price_source: priceSource, observed_at: quote?.observed_at || latest?.observed_at || latest?.date || null }, factors: ['Điểm được tính lại theo tiêu chí đã chọn', 'Hệ số học từ kết quả lịch sử chỉ áp dụng khi đủ mẫu', 'Không phải khuyến nghị mua bán'] } };
  }).sort((a, b) => b.score - a.score || a.symbol.localeCompare(b.symbol)).slice(0, Math.min(30, Math.max(1, Number(limit) || 10))).map((item, index) => ({ ...item, rank: index + 1 }));
}

module.exports = { scoreAnalysis, buildEvidenceProfile, buildShortTermRecommendations, buildPersonalizedRecommendations, evaluateRecommendations, DEFAULT_CRITERIA };
