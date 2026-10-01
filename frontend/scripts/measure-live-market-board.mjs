const apiBase = (process.env.MARKET_API_BASE || 'http://127.0.0.1:5000').replace(/\/$/, '')
const sampleCount = Math.max(1, Number.parseInt(process.env.MARKET_SAMPLES || '5', 10) || 5)
const pageSize = Math.min(100, Math.max(1, Number.parseInt(process.env.MARKET_PAGE_SIZE || '40', 10) || 40))
const timeoutMs = Math.max(1_000, Number.parseInt(process.env.MARKET_TIMEOUT_MS || '35000', 10) || 35000)

const percentile = (values, fraction) => {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))]
}

async function request(path) {
  const startedAt = performance.now()
  try {
    const response = await fetch(`${apiBase}${path}`, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'application/json' } })
    const payload = await response.json().catch(() => null)
    return { path, duration_ms: Math.round(performance.now() - startedAt), status: response.status, ok: response.ok && payload?.success !== false, payload }
  } catch (error) {
    return { path, duration_ms: Math.round(performance.now() - startedAt), status: null, ok: false, error: error.name === 'TimeoutError' ? 'timeout' : error.message }
  }
}

const samples = []
for (let index = 0; index < sampleCount; index += 1) {
  const list = await request(`/api/stocks?page=1&pageSize=${pageSize}&sort=volume&direction=desc`)
  const stocks = Array.isArray(list.payload?.data) ? list.payload.data : []
  const symbols = stocks.map(stock => String(stock.symbol || stock.code || stock.stock_code || '')).filter(Boolean)
  const quote = symbols.length ? await request(`/api/stocks/quotes?symbols=${encodeURIComponent(symbols.join(','))}&board_trace=${index + 1}`) : null
  samples.push({ sample: index + 1, list: { duration_ms: list.duration_ms, status: list.status, ok: list.ok, rows: symbols.length, error: list.error || null }, quote: quote && { duration_ms: quote.duration_ms, status: quote.status, ok: quote.ok, symbols_requested: symbols.length, symbols_returned: Object.keys(quote.payload?.data || {}).length, error: quote.error || null } })
}

const metric = key => samples.map(sample => sample[key]?.duration_ms).filter(Number.isFinite)
const summary = Object.fromEntries(['list', 'quote'].map(key => {
  const values = metric(key)
  return [key, values.length ? { p50_ms: percentile(values, 0.5), p95_ms: percentile(values, 0.95), samples: values } : null]
}))

console.log(JSON.stringify({ measured_at: new Date().toISOString(), api_base: apiBase, page_size: pageSize, timeout_ms: timeoutMs, samples, summary }, null, 2))
