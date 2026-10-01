import { useEffect, useState } from 'react'
import { requestJson, stockQuote, stockQuotes } from '../services/api.mjs'

// Loading describes a request, never the presence/absence of market data.
// Poll only the active page, serially, and retain successful results briefly
// through a transient failure without confusing them with a new observation.
export default function useLiveQuotes(symbols, { enabled = true, stockId = null } = {}) {
  const key = [...new Set(symbols.filter(Boolean))].sort().join(',')
  const url = !enabled ? null : stockId ? `/api/stocks/${encodeURIComponent(stockId)}/quote`
    : key ? `/api/stocks/quotes?symbols=${encodeURIComponent(key)}` : null
  const [state, setState] = useState({ url: null, data: {}, loading: false, error: '', providerStatus: null })
  useEffect(() => {
    if (!url) return
    let cancelled = false, poll, controller
    let pollCount = 0
    const retained = new Map()
    setState({ url, data: {}, loading: true, error: '', providerStatus: null })
    const load = async () => {
      controller = new AbortController()
      let quotes = {}, error = ''
      let providerStatus = null
      const quoteUrl = stockId ? url : `${url}&poll=${pollCount++}`
      try {
        const [quoteResult, statusResult] = await Promise.allSettled([
          requestJson(quoteUrl, { signal: controller.signal, timeoutMs: 0 }),
          requestJson('/api/stocks/quotes/status', { signal: controller.signal, timeoutMs: 0 })
        ])
        if (statusResult.status === 'fulfilled') providerStatus = statusResult.value?.data || null
        if (quoteResult.status === 'rejected') throw quoteResult.reason
        const payload = quoteResult.value
        const quote = stockId ? stockQuote(payload) : null
        quotes = quote ? { [quote.symbol || quote.stock_code || key]: quote } : stockQuotes(payload)
        if (!Object.keys(quotes).length) error = 'Chưa lấy được intraday; sẽ tự thử lại.'
        else if (Object.values(quotes).some(value => value.stale)) error = 'Intraday đang dùng giá đã nhận gần nhất; sẽ tự cập nhật.'
      } catch {
        error = 'Chưa cập nhật được intraday; sẽ tự thử lại.'
      }
      if (cancelled) return
      for (const [symbol, quote] of Object.entries(quotes)) {
        const previous = retained.get(symbol)
        const at = previous?.quote.fetched_at === quote.fetched_at ? previous.at : Date.now()
        retained.set(symbol, { quote, at })
      }
      const data = Object.fromEntries([...retained].filter(([, entry]) => Date.now() - entry.at < 90000).map(([symbol, entry]) => [symbol, entry.quote]))
      if (cancelled) return
      setState({ url, data, loading: false, error, providerStatus })
      const expected = stockId ? 1 : key.split(',').filter(Boolean).length
      poll = setTimeout(load, Object.keys(data).length < expected || error ? 5000 : 30000)
    }
    load()
    return () => { cancelled = true; clearTimeout(poll); controller?.abort() }
  }, [url, stockId, key])
  if (!url) return { data: {}, loading: false, error: '', providerStatus: null }
  return state.url === url ? state : { data: {}, loading: true, error: '', providerStatus: null }
}
