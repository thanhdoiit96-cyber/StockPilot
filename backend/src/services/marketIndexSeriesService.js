const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SYMBOL = /^[A-Z0-9_-]{2,24}$/;
const RETURN_TYPES = new Set(['price_return', 'total_return']);

const finitePositive = value => Number.isFinite(Number(value)) && Number(value) > 0;
const validUrl = value => {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
};
const validTimestamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const ascending = (values, key) => values.every((value, index) => index === 0 || key(values[index - 1]) < key(value));

function validateMarketIndexSeries(series) {
  const reasons = [];
  if (!series || typeof series !== 'object') return { valid: false, reasons: ['invalid_payload'] };
  if (!SYMBOL.test(String(series.symbol || '').toUpperCase())) reasons.push('invalid_symbol');
  if (!series.provider || series.provider === 'fixture') reasons.push('unapproved_provider');
  if (!series.license || typeof series.license !== 'string') reasons.push('missing_license');
  if (!validUrl(series.source_url)) reasons.push('invalid_source_url');
  if (series.session_timezone !== 'Asia/Ho_Chi_Minh') reasons.push('invalid_session_timezone');
  if (!RETURN_TYPES.has(series.return_type)) reasons.push('invalid_return_type');
  if (!validTimestamp(series.observed_at)) reasons.push('invalid_observed_at');
  if (!Number.isInteger(series.stale_after_seconds) || series.stale_after_seconds < 1) reasons.push('invalid_stale_window');
  if (!series.previous_close || !DATE.test(series.previous_close.session_date || '') || !finitePositive(series.previous_close.close)) reasons.push('invalid_previous_close');
  const daily = Array.isArray(series.points) ? series.points : [];
  if (daily.length < 2 || !daily.every(point => DATE.test(point?.session_date || '') && finitePositive(point.close)) || !ascending(daily, point => point.session_date)) reasons.push('invalid_daily_points');
  if (series.intraday_points !== undefined) {
    const intraday = Array.isArray(series.intraday_points) ? series.intraday_points : [];
    const day = typeof series.observed_at === 'string' ? series.observed_at.slice(0, 10) : '';
    if (intraday.length < 2 || !intraday.every(point => validTimestamp(point?.observed_at) && point.observed_at.startsWith(day) && finitePositive(point.close)) || !ascending(intraday, point => Date.parse(point.observed_at))) reasons.push('invalid_intraday_points');
  }
  return { valid: reasons.length === 0, reasons };
}

function classifyMarketIndexSeries(series, now = new Date()) {
  const validation = validateMarketIndexSeries(series);
  if (!validation.valid) return { status: 'error', code: 'market_index_contract_invalid', reasons: validation.reasons, data: null };
  const ageMs = Math.max(0, now.getTime() - Date.parse(series.observed_at));
  return { status: ageMs > series.stale_after_seconds * 1000 ? 'stale' : 'fresh', code: null, reasons: [], data: series };
}

async function loadMarketIndexSeries(adapter, { symbols, now = new Date() } = {}) {
  if (!adapter || typeof adapter.fetchIndexSeries !== 'function') return { status: 'error', code: 'market_index_provider_unavailable', items: [] };
  try {
    const series = await adapter.fetchIndexSeries({ symbols });
    const items = (Array.isArray(series) ? series : []).map(item => classifyMarketIndexSeries(item, now));
    const status = items.some(item => item.status === 'fresh') ? 'fresh' : items.some(item => item.status === 'stale') ? 'stale' : 'error';
    return { status, code: null, items };
  } catch (error) {
    return { status: 'error', code: 'market_index_provider_failed', items: [] };
  }
}

module.exports = { validateMarketIndexSeries, classifyMarketIndexSeries, loadMarketIndexSeries };
