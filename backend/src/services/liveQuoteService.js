'use strict';

const { createVnstockIntradayFetcher } = require('../market-data/adapters/vnstockBridgeFetcher');
const { latestQuotes } = require('./intradayQuote');

// One service for overview, detail and portfolio: per-symbol coalescing and a
// bounded worker queue prevent page navigation from multiplying provider calls.
function createLiveQuoteService(fetcher, {
  now = Date.now,
  ttlMs = 10000,
  staleMs = 90000,
  concurrency = 3,
  failureThreshold = 3,
  cooldownMs = 30000
} = {}) {
  const cache = new Map(), pending = new Map(), retryAfter = new Map(), queue = [];
  let batchPending = null;
  const metrics = { successes: 0, failures: 0, consecutiveFailures: 0, lastSuccessAt: null, lastFailureAt: null, lastError: null, openUntil: 0 };
  let active = 0;
  const circuitOpen = () => now() < metrics.openUntil;
  const markSuccess = () => {
    metrics.successes += 1;
    metrics.consecutiveFailures = 0;
    metrics.lastSuccessAt = new Date(now()).toISOString();
    metrics.lastError = null;
    metrics.openUntil = 0;
  };
  const markFailure = error => {
    metrics.failures += 1;
    metrics.consecutiveFailures += 1;
    metrics.lastFailureAt = new Date(now()).toISOString();
    metrics.lastError = error?.message || String(error || 'empty intraday response');
    if (metrics.consecutiveFailures >= failureThreshold) metrics.openUntil = now() + cooldownMs;
  };
  const drain = () => {
    while (active < concurrency && queue.length) {
      const job = queue.shift(); active += 1;
      Promise.resolve().then(() => {
        if (circuitOpen()) throw new Error('intraday provider circuit open');
        return fetcher({ symbols: [job.symbol], source: 'VCI', mode: 'intraday' });
      })
        .then(rows => {
          const quote = latestQuotes(rows, [job.symbol])[job.symbol];
          if (quote) { cache.set(job.symbol, { quote, at: now() }); markSuccess(); }
          else { markFailure(); retryAfter.set(job.symbol, now() + 5000); }
        }).catch(error => {
          // Jobs already queued when the circuit opens should drain quickly
          // without extending the cooldown on every symbol.
          if (error?.message !== 'intraday provider circuit open') markFailure(error);
          retryAfter.set(job.symbol, now() + 5000);
        })
        .finally(() => { active -= 1; pending.delete(job.symbol); job.resolve(); drain(); });
    }
  };
  const session = time => new Date(time + 7 * 3600000).toISOString().slice(0, 10);
  const peek = symbols => Object.fromEntries(symbols.flatMap(symbol => {
    const entry = cache.get(symbol);
    if (!entry || now() - entry.at > staleMs || session(Date.parse(entry.quote.observed_at)) !== session(now())) return [];
    return [[symbol, { ...entry.quote, cached: true, stale: now() - entry.at >= ttlMs }]];
  }));
  return {
    peek,
    health() {
      const open = circuitOpen();
      return {
        provider: 'vnstock/vci',
        status: open ? 'circuit_open' : (metrics.lastFailureAt && metrics.lastFailureAt > metrics.lastSuccessAt ? 'degraded' : 'ready'),
        circuit_open: open,
        circuit_open_until: open ? new Date(metrics.openUntil).toISOString() : null,
        active,
        queued: queue.length,
        cached: cache.size,
        pending: pending.size,
        successes: metrics.successes,
        failures: metrics.failures,
        consecutive_failures: metrics.consecutiveFailures,
        last_success_at: metrics.lastSuccessAt,
        last_failure_at: metrics.lastFailureAt,
        last_error: metrics.lastError
      };
    },
    async load(symbols, { waitMs = 8000 } = {}) {
      const wanted = [...new Set(symbols.map(s => String(s).toUpperCase()))].slice(0, 200);
      // Overview asks for a universe; send it as one provider request instead
      // of creating a 40-item serial queue that starves subsequent refreshes.
      if (wanted.length > 5) {
        if (!batchPending) {
          batchPending = Promise.resolve().then(async () => {
            if (circuitOpen()) return;
            try {
              const rows = await fetcher({ symbols: wanted, source: 'VCI', mode: 'intraday' });
              const quotes = latestQuotes(rows, wanted);
              Object.entries(quotes).forEach(([symbol, quote]) => cache.set(symbol, { quote, at: now() }));
              if (Object.keys(quotes).length) markSuccess(); else markFailure();
              wanted.filter(symbol => !quotes[symbol]).forEach(symbol => retryAfter.set(symbol, now() + 5000));
            } catch (error) { markFailure(error); wanted.forEach(symbol => retryAfter.set(symbol, now() + 5000)); }
          }).finally(() => { batchPending = null; });
        }
        let timer;
        await Promise.race([batchPending, new Promise(resolve => { timer = setTimeout(resolve, waitMs); })]);
        clearTimeout(timer);
        return peek(wanted);
      }
      for (const symbol of wanted) {
        const entry = cache.get(symbol);
        if (entry && now() - entry.at < ttlMs || pending.has(symbol) || now() < (retryAfter.get(symbol) || 0)) continue;
        let resolve;
        pending.set(symbol, new Promise(done => { resolve = done; }));
        const job = { symbol, resolve };
        // A selected detail or small portfolio does not wait behind the universe.
        if (wanted.length <= 5) queue.unshift(job); else queue.push(job);
      }
      drain();
      let timer;
      const waits = wanted.map(symbol => pending.get(symbol)).filter(Boolean);
      await Promise.race([
        Promise.all(waits),
        waits.length ? Promise.race(waits) : Promise.resolve(),
        new Promise(resolve => { timer = setTimeout(resolve, waitMs); })
      ]);
      clearTimeout(timer);
      return peek(wanted);
    }
  };
}

const primaryIntraday = createVnstockIntradayFetcher({ retries: 0, timeoutMs: 3500, backoffMs: 300 });
const localIntraday = createVnstockIntradayFetcher({ retries: 0, timeoutMs: 2500, disableWorker: true });
const fallbackIntraday = process.env.VNSTOCK_SOURCE_FALLBACK
  ? createVnstockIntradayFetcher({ retries: 0, timeoutMs: 3500, backoffMs: 300 })
  : null;
  const fetchIntraday = async ({ symbols, source = 'VCI', mode = 'intraday' }) => {
  const wanted = [...new Set((symbols || []).map(symbol => String(symbol).toUpperCase()))];
  const primary = async requestSymbols => primaryIntraday({ symbols: requestSymbols, source: 'VCI', mode });
  try {
    const rows = await primary(wanted);
    if (rows?.length) {
      // Price-board calls can legitimately return a partial universe when VCI
      // resets one low-liquidity symbol. Retry only the missing symbols while
      // retaining the fast batch response for everything that succeeded.
      const seen = new Set(rows.map(row => String(row.symbol || row.ticker || '').toUpperCase()));
      const missing = wanted.filter(symbol => !seen.has(symbol));
      if (missing.length && wanted.length > 1) {
        try {
          // Keep the recovery request above the worker's price-board batch
          // threshold so a partial 40-symbol response is repaired in one
          // provider call instead of issuing slow per-symbol requests.
          const recovered = await primary(missing);
          if (recovered?.length) return rows.concat(recovered);
        } catch { /* Keep the successful partial batch. */ }
      }
      return rows;
    }
    try {
      const localRows = await localIntraday({ symbols, source: 'VCI', mode });
      if (localRows?.length) return localRows;
    } catch { /* Continue to the configured source fallback. */ }
    if (!fallbackIntraday) return rows || [];
  } catch (error) {
    // A single-symbol request is more reliable when retried independently;
    // this covers intermittent worker/provider resets seen for symbols such as
    // VIC without delaying the overview batch.
    if (wanted.length === 1) {
      try {
        await new Promise(resolve => setTimeout(resolve, 180));
        const retried = await primary(wanted);
        if (retried?.length) return retried;
      } catch { /* Continue through local/fallback sources. */ }
    }
    try {
      const rows = await localIntraday({ symbols, source: 'VCI', mode });
      if (rows?.length) return rows;
    } catch { /* Continue to the configured source fallback. */ }
    if (!fallbackIntraday) throw error;
  }
  // VCI can reset a single low-liquidity request. Retry only that symbol
  // through the explicitly configured fallback; do not replace successful VCI.
  try { return await fallbackIntraday({ symbols, source: process.env.VNSTOCK_SOURCE_FALLBACK, mode }); }
  catch (error) { return localIntraday({ symbols, source: process.env.VNSTOCK_SOURCE_FALLBACK, mode }).catch(() => { throw error; }); }
};
// The Vnstock worker is process-backed and can reset concurrent intraday
// requests. Serialize its calls; page-level requests still share pending work.
const service = createLiveQuoteService(fetchIntraday, { concurrency: 1 });
module.exports = { createLiveQuoteService, liveQuoteService: service };
