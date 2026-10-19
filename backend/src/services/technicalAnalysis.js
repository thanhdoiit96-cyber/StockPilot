'use strict';

function sma(values, period) {
  return values.length < period ? null : values.slice(-period).reduce((sum, value) => sum + value, 0) / period;
}
function ema(values, period) {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let result = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  for (const value of values.slice(period)) result = value * k + result * (1 - k);
  return result;
}
function rsi(values, period = 14) {
  if (values.length <= period) return null;
  let gains = 0; let losses = 0;
  for (let i = 1; i <= period; i += 1) { const change = values[i] - values[i - 1]; if (change >= 0) gains += change; else losses -= change; }
  if (losses === 0) return 100;
  let averageGain = gains / period; let averageLoss = losses / period;
  for (let i = period + 1; i < values.length; i += 1) { const change = values[i] - values[i - 1]; averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period; averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period; }
  return 100 - (100 / (1 + averageGain / (averageLoss || 1e-9)));
}

function ichimoku(values) {
  if (values.length < 52) return { conversion: null, base: null, spanA: null, spanB: null, cloud: 'insufficient_data' };
  const midpoint = period => { const slice = values.slice(-period); return (Math.max(...slice) + Math.min(...slice)) / 2; };
  const conversion = midpoint(9); const base = midpoint(26); const spanB = midpoint(52); const spanA = (conversion + base) / 2; const latest = values.at(-1);
  return { conversion, base, spanA, spanB, cloud: latest > Math.max(spanA, spanB) ? 'above_cloud' : latest < Math.min(spanA, spanB) ? 'below_cloud' : 'inside_cloud' };
}
function emaSeries(values, period) {
  if (values.length < period) return [];
  const k = 2 / (period + 1); const result = [];
  let current = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  result.push(current);
  for (const value of values.slice(period)) { current = value * k + current * (1 - k); result.push(current); }
  return result;
}
function macd(values) {
  if (values.length < 35) return { line: null, signal: null, histogram: null, state: 'insufficient_data' };
  const fast = emaSeries(values, 12); const slow = emaSeries(values, 26);
  const lineSeries = values.slice(25).map((_, index) => fast[index + 14] - slow[index]);
  const line = lineSeries.at(-1); const signalSeries = emaSeries(lineSeries, 9); const signal = signalSeries.at(-1);
  const histogram = signal == null ? null : line - signal;
  return { line, signal, histogram, state: histogram == null ? 'insufficient_data' : histogram > 1e-8 ? 'bullish' : histogram < -1e-8 ? 'bearish' : 'neutral' };
}
function bollinger(values, period = 20, multiplier = 2) {
  if (values.length < period) return { middle: null, upper: null, lower: null, bandwidth: null, position: 'insufficient_data' };
  const sample = values.slice(-period); const middle = sample.reduce((sum, value) => sum + value, 0) / period;
  const deviation = Math.sqrt(sample.reduce((sum, value) => sum + (value - middle) ** 2, 0) / period);
  const upper = middle + multiplier * deviation; const lower = middle - multiplier * deviation; const latest = values.at(-1);
  return { middle, upper, lower, bandwidth: middle ? (upper - lower) / middle : null, position: latest > upper ? 'above_upper' : latest < lower ? 'below_lower' : latest >= middle ? 'upper_half' : 'lower_half' };
}

function analyzePrices(rows) {
  const closes = rows.map(row => Number(row.close ?? row.price)).filter(Number.isFinite);
  const latest = closes.at(-1) ?? null; const sma20 = sma(closes, 20); const sma50 = sma(closes, 50); const rsi14 = rsi(closes); const ichimoku14 = ichimoku(closes); const macd12 = macd(closes); const bollinger20 = bollinger(closes);
  const trend = latest == null ? 'insufficient_data' : sma20 == null ? 'insufficient_data' : latest > sma20 ? 'above_sma20' : 'below_sma20';
  const signals = [];
  if (rsi14 != null) signals.push(rsi14 >= 70 ? 'overbought' : rsi14 <= 30 ? 'oversold' : 'rsi_neutral');
  if (trend !== 'insufficient_data') signals.push(trend);
  return { as_of: rows.at(-1)?.observed_at || null, observations: closes.length, indicators: { sma20, sma50, ema12: ema(closes, 12), ema26: ema(closes, 26), rsi14, ichimoku: ichimoku14, macd: macd12, bollinger: bollinger20 }, trend, signals, methodology: 'SMA/EMA/RSI, Ichimoku (9/26/52), MACD (12/26/9) và Bollinger (20/2) từ giá đóng cửa; không phải khuyến nghị đầu tư', disclaimer: 'Chỉ nhằm mục đích nghiên cứu, không phải lời khuyên đầu tư.' };
}

function buildTechnicalInsight(analysis) {
  const { indicators = {}, trend, signals = [] } = analysis || {};
  const factors = [];
  if (trend === 'above_sma20') factors.push('Giá đóng cửa gần nhất cao hơn SMA20, cho thấy động lượng ngắn hạn đang tích cực.');
  if (trend === 'below_sma20') factors.push('Giá đóng cửa gần nhất thấp hơn SMA20, cho thấy động lượng ngắn hạn đang yếu hơn.');
  if (signals.includes('overbought')) factors.push('RSI14 ở vùng quá mua; cần thận trọng với khả năng điều chỉnh.');
  if (signals.includes('oversold')) factors.push('RSI14 ở vùng quá bán; tín hiệu hồi phục cần được xác nhận thêm.');
  if (!factors.length) factors.push('Chưa đủ dữ liệu để tạo nhận định kỹ thuật đáng tin cậy.');
  const label = trend === 'above_sma20' ? 'Tích cực ngắn hạn' : trend === 'below_sma20' ? 'Yếu ngắn hạn' : 'Chưa đủ dữ liệu';
  return { label, factors, indicators, generated_at: new Date().toISOString(), model: 'rule_based_technical_v1', disclaimer: 'Nhận định tự động phục vụ nghiên cứu, không phải khuyến nghị mua bán.' };
}

function buildExternalFactorSummary(factors = []) {
  const verified = factors.filter(item => item && item.source && item.published_at && item.status === 'verified');
  return { status: verified.length ? 'available' : 'not_available', verified_count: verified.length, factors: verified.map(item => ({ type: item.type || 'unknown', title: item.title || null, source: item.source, source_url: item.source_url || null, published_at: item.published_at, impact: item.impact || 'unknown' })), disclaimer: verified.length ? 'Yếu tố bên ngoài đã có nguồn; tác động chỉ mang tính tham khảo.' : 'Chưa có yếu tố bên ngoài được xác minh cho mã này; không suy diễn từ dữ liệu thiếu.' };
}

function buildCombinedInsight(analysis, externalFactors = []) {
  const technical = buildTechnicalInsight(analysis);
  const verified = externalFactors.filter(item => item.status === 'verified');
  const factors = [...technical.factors];
  if (verified.length) factors.push(`Có ${verified.length} yếu tố bên ngoài đã xác minh được dùng làm bối cảnh; cần đọc nguồn gốc trước khi diễn giải tác động.`);
  const confidence = analysis.observations >= 50 && verified.length ? 'moderate' : analysis.observations >= 20 || verified.length ? 'limited' : 'insufficient';
  return { ...technical, factors, confidence, context_count: verified.length, model: 'rule_based_fusion_v1' };
}

function buildEvaluationFactors(analysis = {}, externalFactors = []) {
  const verified = externalFactors.filter(item => item && item.status === 'verified');
  const hasType = types => verified.some(item => types.includes(String(item.type || '').toLowerCase()));
  const trendScore = analysis.trend === 'above_sma20' ? 70 : analysis.trend === 'below_sma20' ? 35 : 50;
  const rsi = Number(analysis.indicators?.rsi14);
  const marketScore = Number.isFinite(rsi) ? Math.max(0, Math.min(100, trendScore + (rsi >= 45 && rsi <= 65 ? 10 : rsi >= 70 || rsi <= 30 ? -10 : 0))) : trendScore;
  return [
    { key: 'market_expectation', label: 'Kỳ vọng thị trường', status: analysis.observations >= 20 ? 'available' : 'insufficient', score: marketScore, detail: analysis.trend === 'above_sma20' ? 'Xu hướng đang cao hơn SMA20.' : analysis.trend === 'below_sma20' ? 'Xu hướng đang thấp hơn SMA20.' : 'Chưa đủ dữ liệu xu hướng.' },
    { key: 'financial_report', label: 'Báo cáo tài chính', status: hasType(['financial_report', 'earnings', 'financial']) ? 'verified' : 'not_available', score: hasType(['financial_report', 'earnings', 'financial']) ? 70 : null, detail: hasType(['financial_report', 'earnings', 'financial']) ? 'Có nguồn báo cáo tài chính đã xác minh.' : 'Chưa có báo cáo tài chính được xác minh trong dữ liệu hiện tại.' },
    { key: 'shareholder_meeting', label: 'Tin họp cổ đông', status: hasType(['shareholder_meeting', 'agm', 'investor_event']) ? 'verified' : 'not_available', score: hasType(['shareholder_meeting', 'agm', 'investor_event']) ? 60 : null, detail: hasType(['shareholder_meeting', 'agm', 'investor_event']) ? 'Có thông tin sự kiện cổ đông đã xác minh.' : 'Chưa có thông tin họp cổ đông được xác minh.' }
  ];
}

function buildHorizonAdvice(analysis = {}, riskPlan = {}) {
  const trend = analysis.trend === 'above_sma20' ? 'Tích cực' : analysis.trend === 'below_sma20' ? 'Thận trọng' : 'Theo dõi';
  const quality = analysis.observations >= 50 ? 'dữ liệu đủ để đánh giá' : 'cần bổ sung dữ liệu';
  return {
    short_term: { label: 'Ngắn hạn', window: '1–20 phiên (~1 tháng)', advice: `${trend}: ưu tiên quản trị điểm vào, RSI và stop loss; ${quality}.`, reference: riskPlan.horizons?.short_term || null },
    medium_term: { label: 'Trung hạn', window: '1–6 tháng', advice: `${trend}: theo dõi khả năng duy trì trên SMA20 và cập nhật báo cáo tài chính trước khi tăng tỷ trọng.`, reference: riskPlan.horizons?.medium_term || null },
    long_term: { label: 'Dài hạn', window: 'Trên 6 tháng', advice: 'Chỉ cân nhắc tích lũy khi chất lượng dữ liệu, nền tảng tài chính và triển vọng doanh nghiệp được xác minh độc lập.', reference: riskPlan.horizons?.long_term || null }
  };
}

function buildExpertGuidance(analysis = {}, riskPlan = {}) {
  const cloud = analysis.indicators?.ichimoku?.cloud; const macdState = analysis.indicators?.macd?.state; const bollingerPosition = analysis.indicators?.bollinger?.position;
  const rsiValue = Number(analysis.indicators?.rsi14); const scoreBreakdown = [
    { key: 'trend', label: 'Xu hướng SMA20', score: analysis.trend === 'above_sma20' ? 25 : analysis.trend === 'below_sma20' ? 0 : 12, detail: analysis.trend === 'above_sma20' ? 'Giá trên SMA20' : analysis.trend === 'below_sma20' ? 'Giá dưới SMA20' : 'Chưa đủ dữ liệu' },
    { key: 'ichimoku', label: 'Mây Ichimoku', score: cloud === 'above_cloud' ? 25 : cloud === 'below_cloud' ? 0 : cloud === 'inside_cloud' ? 12 : null, detail: cloud === 'above_cloud' ? 'Giá trên mây' : cloud === 'below_cloud' ? 'Giá dưới mây' : cloud === 'inside_cloud' ? 'Giá trong mây' : 'Chưa đủ dữ liệu' },
    { key: 'macd', label: 'MACD 12/26/9', score: macdState === 'bullish' ? 20 : macdState === 'bearish' ? 0 : macdState === 'neutral' ? 10 : null, detail: macdState === 'bullish' ? 'Động lượng dương' : macdState === 'bearish' ? 'Động lượng âm' : 'Động lượng trung tính' },
    { key: 'rsi', label: 'RSI14', score: Number.isFinite(rsiValue) ? rsiValue >= 45 && rsiValue <= 65 ? 15 : rsiValue >= 70 || rsiValue <= 30 ? 5 : 10 : null, detail: Number.isFinite(rsiValue) ? `RSI ${rsiValue.toFixed(1)}` : 'Chưa đủ dữ liệu' },
    { key: 'bollinger', label: 'Bollinger Bands', score: bollingerPosition === 'above_upper' ? 5 : bollingerPosition === 'below_lower' ? 12 : bollingerPosition === 'insufficient_data' ? null : 15, detail: bollingerPosition || 'Chưa đủ dữ liệu' }
  ];
  const availableScores = scoreBreakdown.filter(item => Number.isFinite(item.score)); const technicalScore = availableScores.length ? Math.round(availableScores.reduce((sum, item) => sum + item.score, 0) / availableScores.length * 100 / 100) : null;
  const confirmation = analysis.trend === 'above_sma20' && cloud === 'above_cloud' && macdState === 'bullish' ? 'Ưu tiên chờ giá giữ trên SMA20, mây Ichimoku và MACD duy trì dương trước khi giải ngân từng phần.' : analysis.trend === 'below_sma20' || cloud === 'below_cloud' || macdState === 'bearish' ? 'Chờ tín hiệu đảo chiều rõ hơn; tránh tăng tỷ trọng khi xu hướng, mây hoặc MACD còn suy yếu.' : 'Theo dõi giao cắt Tenkan/Kijun, MACD và vị trí giá trong dải Bollinger trước khi quyết định.';
  return { model: 'rule_based_expert_guidance_v1', technical_score: technicalScore, score_breakdown: scoreBreakdown, stance: analysis.trend === 'above_sma20' && cloud !== 'below_cloud' && macdState !== 'bearish' ? 'Theo dõi tích cực' : analysis.trend === 'below_sma20' || cloud === 'below_cloud' || macdState === 'bearish' ? 'Thận trọng' : 'Trung lập', confirmation, watch: ['SMA20/SMA50 và giao cắt EMA12/EMA26', 'RSI14 để nhận biết quá mua/quá bán', 'Tenkan/Kijun và giá so với mây Ichimoku', 'MACD 12/26/9 để xác nhận động lượng', `Bollinger: theo dõi vị trí ${bollingerPosition || 'chưa đủ dữ liệu'} và độ rộng dải`, 'Khối lượng, báo cáo tài chính và tin họp cổ đông'], avoid: ['Mua đuổi khi RSI quá mua hoặc giá vượt dải Bollinger trên', 'Tăng tỷ trọng khi dữ liệu tài chính/tin tức chưa được xác minh', 'Xem dự báo rule-based như mức giá chắc chắn'], forecast: { short_term: 'Biến động ngắn hạn phụ thuộc động lượng MACD, RSI và vị trí giá trong dải Bollinger.', medium_term: 'Trung hạn cần xác nhận xu hướng bằng SMA20/SMA50, Ichimoku, MACD, thanh khoản và kết quả kinh doanh.', long_term: 'Dài hạn chỉ phù hợp khi triển vọng doanh nghiệp, báo cáo tài chính và rủi ro ngành được xác minh.' }, risk_note: riskPlan.disclaimer || 'Luôn đặt mức rủi ro và kế hoạch thoát lệnh trước khi đầu tư.' };
}

module.exports = { analyzePrices, buildTechnicalInsight, buildExternalFactorSummary, buildCombinedInsight, buildEvaluationFactors, buildHorizonAdvice, buildExpertGuidance };
