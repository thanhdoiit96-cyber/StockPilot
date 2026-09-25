// Vnstock intraday prices use thousands of VND, like its EOD feed.
function latestQuotes(rows, symbols, { fetchedAt = new Date().toISOString(), upstream = 'VCI', priceScale = 1000 } = {}) {
  const quotes = {};
  for (const row of rows) {
    const symbol = String(row.symbol || '').toUpperCase();
    const price = Number(row.price) * (row.price_unit === 'VND_PER_SHARE' ? 1 : priceScale);
    let time = String(row.time || '').trim().replace(' ', 'T');
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(time)) time += '+07:00';
    if (!symbols.includes(symbol) || !Number.isFinite(price) || price <= 0 || !Number.isFinite(Date.parse(time))) continue;
    if (quotes[symbol] && Date.parse(quotes[symbol].observed_at) > Date.parse(time)) continue;
    quotes[symbol] = { symbol, price, volume: row.volume == null ? null : Number(row.volume), observed_at: time, fetched_at: fetchedAt,
      volume_type: row.volume_type || 'trade', timestamp_kind: row.timestamp_kind || 'trade',
      change: Number(row.reference_price) > 0 ? (price / Number(row.reference_price) - 1) * 100 : null,
      provider: 'vnstock', upstream, interval: 'intraday', is_delayed: true, currency: 'VND', price_unit: 'VND_PER_SHARE',
      license: 'personal_research_only', license_url: 'https://vnstocks.com/onboard/giay-phep-su-dung' };
  }
  return quotes;
}
module.exports = { latestQuotes };
