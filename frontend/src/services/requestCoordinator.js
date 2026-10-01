const CACHE_TTL_MS = 15_000
const STOCK_LIST_TTL_MS = 8_000
const RATE_LIMIT_TTL_MS = 8_000

export function installRequestCoordinator() {
  if (window.__stockpilotRequestCoordinator) return
  window.__stockpilotRequestCoordinator = true

  const nativeFetch = window.fetch.bind(window)
  const cache = new Map()
  const pending = new Map()
  const gatedAnalysis = new Map()
  let analysisRequested = false

  window.__stockpilotRequestAnalysis = () => {
    analysisRequested = true
    for (const [key, request] of gatedAnalysis) {
      gatedAnalysis.delete(key)
      nativeFetch(request.input, request.init).then(request.resolve, request.reject)
    }
  }
  window.__stockpilotResetAnalysis = () => { analysisRequested = false }

  window.fetch = (input, init = {}) => {
    const request = new Request(input, init)
    const url = new URL(request.url, window.location.href)

    if (request.method === 'POST' && url.pathname === '/api/recommendations/saved') {
      return nativeFetch(input, init).then(async response => {
        if (!response.ok) return response
        const body = await response.text()
        try {
          const payload = JSON.parse(body)
          if (payload?.success === true && !payload.data) {
            const requestBody = JSON.parse(await request.clone().text())
            const saved = {
              id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              createdAt: new Date().toISOString(),
              criteria: requestBody.criteria || {},
              result: requestBody.result || null
            }
            return new Response(JSON.stringify({ ...payload, data: saved }), {
              status: response.status,
              headers: response.headers
            })
          }
        } catch (_) { /* The API client reports malformed JSON. */ }
        return new Response(body, { status: response.status, headers: response.headers })
      })
    }

    const isAnalysis = /^\/api\/stocks\/[^/]+\/analysis$/.test(url.pathname)
    if (isAnalysis && !analysisRequested) {
      return new Promise((resolve, reject) => gatedAnalysis.set(request.url, { input, init, resolve, reject }))
    }

    const isStockList = url.pathname === '/api/stocks'
    const isQuoteRequest = /\/api\/stocks\/quotes(?:\/status)?$/.test(url.pathname)
    if (request.method !== 'GET' || (!isStockList && !isQuoteRequest)) return nativeFetch(input, init)

    const key = request.url
    const now = Date.now()
    const cached = cache.get(key)
    const fallbackStockCache = isStockList
      ? [...cache.entries()]
          .filter(([entryKey, entry]) => entry.status === 200 && entry.body && entryKey !== key)
          .sort((a, b) => b[1].at - a[1].at)[0]?.[1]
      : null
    const ttl = cached?.status === 429 ? RATE_LIMIT_TTL_MS : isStockList ? STOCK_LIST_TTL_MS : CACHE_TTL_MS
    if (cached && now - cached.at < ttl) {
      return Promise.resolve(new Response(cached.body, { status: cached.status, headers: cached.headers }))
    }
    // A React effect owns its AbortController.  Sharing that fetch would let
    // StrictMode (or a page switch) abort every later consumer of the same URL.
    // Only coalesce requests that have no caller-provided cancellation signal.
    const canSharePending = !init.signal
    if (canSharePending && pending.has(key)) return pending.get(key).then(response => response.clone())

    const task = nativeFetch(input, init).then(async response => {
      if (response.status === 429 && isStockList && (cached?.body || fallbackStockCache?.body)) {
        const stale = cached || fallbackStockCache
        return new Response(stale.body, {
          status: 200,
          headers: [...stale.headers, ['x-stockpilot-stale', 'rate-limited']]
        })
      }
      if (!response.ok) return response

      const body = await response.text()
      if (url.pathname === '/api/stocks/quotes') {
        try {
          const payload = JSON.parse(body)
          const valid = Object.fromEntries(Object.entries(payload.data || {}).filter(([, quote]) =>
            quote && Number.isFinite(quote.price) && quote.price > 0 && quote.observed_at && Number.isFinite(Date.parse(quote.fetched_at))))
          if (Object.keys(valid).length) {
            window.__stockpilotRecentQuotes = { ...(window.__stockpilotRecentQuotes || {}), ...valid }
            window.dispatchEvent(new Event('stockpilot:quotes-received'))
          }
        } catch (_) { /* Quote validation remains owned by the React hook. */ }
      }

      let cacheable = true
      if (isStockList) {
        try {
          const payload = JSON.parse(body)
          cacheable = payload?.success === true && Array.isArray(payload.data)
        } catch (_) { cacheable = false }
      }
      if (cacheable) {
        cache.set(key, { at: Date.now(), body, status: response.status, headers: [...response.headers.entries()] })
      }
      return new Response(body, { status: response.status, headers: response.headers })
    }).finally(() => {
      if (pending.get(key) === task) pending.delete(key)
    })

    if (canSharePending) pending.set(key, task)
    return task.then(response => response.clone())
  }
}
