const { latestQuotes } = require('./intradayQuote');

function createQuoteLoader(fetchQuotes, { ttlMs = 10000, upstream = 'VCI', mode = 'price-board' } = {}) {
  const cache = new Map();
  const pending = new Map();
  return async symbols => {
    const wanted = [...new Set(symbols)].sort();
    const key = wanted.join(',');
    const cached = cache.get(key);
    if (cached && Date.now() < cached.expires) return cached.quotes;
    if (pending.has(key)) return pending.get(key);
    const promise = (async () => {
      const rows = await fetchQuotes({ symbols: wanted, source: upstream, mode });
      const quotes = latestQuotes(rows, wanted, { upstream });
      cache.set(key, { quotes, expires: Date.now() + ttlMs });
      if (cache.size > 200) cache.delete(cache.keys().next().value);
      return quotes;
    })();
    pending.set(key, promise);
    try { return await promise; } finally { pending.delete(key); }
  };
}
module.exports = { createQuoteLoader };
