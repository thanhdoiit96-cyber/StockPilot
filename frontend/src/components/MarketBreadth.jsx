import { useEffect, useMemo, useState } from 'react'
import { requestJson, stockList } from '../services/api.mjs'
import { SECTOR_OPTIONS, sectorLabel as labelForSector } from '../constants/sectorOptions.mjs'
import { MARKET_BREADTH_SCOPE_KEY, parseMarketBreadthStorageValue, readMarketBreadthScope } from '../services/marketBreadthPreference.mjs'
import MarketBreadthHistory from './MarketBreadthHistory.jsx'
import { translate } from '../services/i18n.mjs'

const GROUPS = [['up', 'overview.up', 'up'], ['down', 'overview.down', 'down'], ['flat', 'overview.flat', 'flat']]

const symbolOf = stock => String(stock.symbol || stock.code || '').toUpperCase()
const compact = value => new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0))
const formatDateTime = value => value && Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value))
  : null
const quoteFor = (quotes, symbol) => quotes[symbol] || quotes[symbol.toUpperCase()] || null

function metricsFor(stocks, quotes) {
  const metrics = {
    up: { count: 0, volume: 0 }, down: { count: 0, volume: 0 }, flat: { count: 0, volume: 0 },
    unknown: 0, quoted: 0, changes: [], latestQuoteAt: null
  }
  const rows = stocks.map(stock => {
    const symbol = symbolOf(stock)
    const quote = quoteFor(quotes, symbol)
    if (quote) {
      metrics.quoted += 1
      if (!metrics.latestQuoteAt || Date.parse(quote.observed_at) > Date.parse(metrics.latestQuoteAt)) metrics.latestQuoteAt = quote.observed_at
    }
    const change = Number(quote?.change ?? stock.change)
    const volume = Number(quote?.volume_type === 'session' ? quote.volume : (quote?.volume ?? stock.volume))
    if (!Number.isFinite(change)) metrics.unknown += 1
    else {
      metrics.changes.push(change)
      const key = change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
      metrics[key].count += 1
      if (Number.isFinite(volume) && volume > 0) metrics[key].volume += volume
    }
    return { stock, symbol, change, volume, quote, observedAt: quote?.observed_at || stock.data_fetched_at || null }
  })
  metrics.classified = metrics.up.count + metrics.down.count + metrics.flat.count
  metrics.average = metrics.changes.length ? metrics.changes.reduce((sum, value) => sum + value, 0) / metrics.changes.length : null
  metrics.totalVolume = metrics.up.volume + metrics.down.volume + metrics.flat.volume
  metrics.maxVolume = Math.max(1, metrics.up.volume, metrics.down.volume, metrics.flat.volume)
  return { metrics, rows }
}

export default function MarketBreadth({ stocks = [], quotes = {}, universeTotal, onOpenDetail, language = 'vi' }) {
  const t = (key, values) => translate(language, key, values)
  const initialScope = useMemo(() => readMarketBreadthScope(), [])
  const [exchange, setExchange] = useState(initialScope.exchange)
  const [sector, setSector] = useState(initialScope.sector)
  const listedStocks = useMemo(() => stocks.filter(stock => (stock.listing_status || stock.listingStatus) === 'listed'), [stocks])
  const [scopedStocks, setScopedStocks] = useState(listedStocks)
  const [scopedQuotes, setScopedQuotes] = useState(quotes)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(MARKET_BREADTH_SCOPE_KEY, JSON.stringify({ exchange, sector })) } catch {}
  }, [exchange, sector])

  useEffect(() => {
    const receiveScope = event => {
      if (event.key !== MARKET_BREADTH_SCOPE_KEY) return
      const next = parseMarketBreadthStorageValue(event.newValue)
      if (!next) return
      setExchange(next.exchange)
      setSector(next.sector)
    }
    window.addEventListener('storage', receiveScope)
    return () => window.removeEventListener('storage', receiveScope)
  }, [])

  useEffect(() => {
    if (!exchange && !sector) {
      setScopedStocks(listedStocks)
      setScopedQuotes(quotes)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    const params = new URLSearchParams({ page: '1', pageSize: '500', q: '', sector, exchange, listing_status: 'listed', sort: 'code', direction: 'asc', pinned: '' })
    requestJson(`/api/stocks?${params}`, { signal: controller.signal })
      .then(async payload => {
        const list = stockList(payload)
        const symbols = list.map(symbolOf).filter(Boolean)
        let nextQuotes = {}
        if (symbols.length) {
          try {
            const quotePayload = await requestJson(`/api/stocks/quotes?symbols=${encodeURIComponent(symbols.join(','))}`, { signal: controller.signal })
            nextQuotes = quotePayload.data && typeof quotePayload.data === 'object' ? quotePayload.data : {}
          } catch (_) { /* EOD values remain usable. */ }
        }
        if (!controller.signal.aborted) {
          setScopedStocks(list)
          setScopedQuotes(nextQuotes)
        }
      })
      .catch(() => { if (!controller.signal.aborted) { setScopedStocks([]); setScopedQuotes({}) } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [exchange, sector, listedStocks, quotes])

  const { metrics, rows } = useMemo(() => metricsFor(scopedStocks, scopedQuotes), [scopedStocks, scopedQuotes])
  const leaders = useMemo(() => [
    [t('overview.topGainers'), [...rows].filter(row => Number.isFinite(row.change)).sort((a, b) => b.change - a.change).slice(0, 3), 'change'],
    [t('overview.topLosers'), [...rows].filter(row => Number.isFinite(row.change)).sort((a, b) => a.change - b.change).slice(0, 3), 'change'],
    [t('overview.topVolume'), [...rows].filter(row => Number.isFinite(row.volume)).sort((a, b) => b.volume - a.volume).slice(0, 3), 'volume']
  ], [rows, language])
  const ratio = metrics.down.count ? (metrics.up.count / metrics.down.count).toFixed(2) : '—'
  const spread = metrics.up.count - metrics.down.count
  const classifiedPercent = scopedStocks.length ? (metrics.classified / scopedStocks.length * 100).toFixed(1) : '—'

  const selectedSectorLabel = labelForSector(sector)
  const displayedTotal = exchange || sector ? scopedStocks.length : Math.max(scopedStocks.length, Number(universeTotal || 0))
  const scopeText = sector
    ? `${scopedStocks.length} ${t('overview.symbols')} · ${exchange || t('overview.allExchanges')} · ${selectedSectorLabel}`
    : exchange ? `${scopedStocks.length} ${t('overview.symbolsOf')} ${exchange}` : `${displayedTotal} ${t('overview.symbolsInUniverse')} · ${metrics.quoted}/${displayedTotal} ${t('overview.quotedIntraday')}`

  return <section className="panel market-breadth-panel" aria-labelledby="market-breadth-heading" lang={language}>
    <div className="panel-header market-breadth-header">
      <div>
        <h3 id="market-breadth-heading">{t('overview.breadth')}</h3>
        <p className="muted-text">{scopeText}{loading ? ` · ${t('overview.updating')}` : ''}</p>
      </div>
      <span className="chip neutral"><span className={metrics.average != null && metrics.average < 0 ? 'negative' : 'positive'}>{metrics.average == null ? 'Chưa đủ dữ liệu' : `Bình quân ${metrics.average >= 0 ? '+' : ''}${metrics.average.toFixed(2)}%`}</span></span>
      <div className="breadth-scope-controls">
        <label className="select-control breadth-exchange-control"><span>{t('overview.exchange')}</span><select className="app-select breadth-exchange-select" aria-label={t('overview.exchangeAria')} value={exchange} onChange={event => setExchange(event.target.value)}>
          <option value="">{t('overview.allExchanges')}</option><option value="HSX">HSX</option><option value="HNX">HNX</option><option value="UPCOM">UPCOM</option>
        </select></label>
        <label className="select-control breadth-sector-control"><span>{t('overview.sector')}</span><select className="app-select breadth-sector-select" aria-label={t('overview.sectorAria')} value={sector} onChange={event => setSector(event.target.value)}>
          {SECTOR_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select></label>
      </div>
    </div>
    <div className="breadth-counts">{GROUPS.map(([key, labelKey, color]) => <article className={`breadth-count ${color}`} key={key}><span>{t(labelKey)}</span><strong>{metrics[key].count}</strong><small>{metrics.classified ? `${(metrics[key].count / metrics.classified * 100).toFixed(1)}% ${t('overview.ofSymbols')}` : t('overview.noData')}</small></article>)}</div>
    <div className="breadth-distribution" role="img" aria-label={`${t('overview.up')} ${metrics.up.count}, ${t('overview.down')} ${metrics.down.count}, ${t('overview.flat')} ${metrics.flat.count}`}>{GROUPS.map(([key, labelKey, color]) => <span className={`breadth-segment ${color}`} style={{ width: `${metrics.classified ? metrics[key].count / metrics.classified * 100 : 0}%` }} title={`${t(labelKey)}: ${metrics[key].count}`} key={key} />)}</div>
    <div className="breadth-snapshot" aria-label="Chỉ số snapshot độ rộng thị trường">
      <div><span>A/D ratio</span><strong>{ratio}</strong><small>Tăng / giảm</small></div>
      <div><span>Chênh lệch A−D</span><strong className={spread >= 0 ? 'positive' : 'negative'}>{spread > 0 ? '+' : ''}{spread}</strong><small>Mã tăng trừ mã giảm</small></div>
      <div><span>Đã phân loại</span><strong>{classifiedPercent}%</strong><small>Dựa trên mã có biến động</small></div>
    </div>
    <div className="breadth-volume-heading"><strong>Khối lượng phiên theo nhóm biến động</strong><span>{compact(metrics.totalVolume)} cổ phiếu</span></div>
    <div className="breadth-volume-chart">{GROUPS.map(([key, labelKey, color]) => <div className="breadth-volume-column" key={key}><div className="breadth-volume-track"><span className={color} style={{ height: `${metrics[key].volume / metrics.maxVolume * 100}%` }} /></div><strong>{compact(metrics[key].volume)}</strong><small>{t(labelKey)}</small></div>)}</div>
    <div className="breadth-leaders">
      <div className="breadth-leaders-header"><div><strong>Nhóm dẫn dắt</strong><small>{[exchange && `Sàn: ${exchange}`, selectedSectorLabel && `Ngành: ${selectedSectorLabel}`].filter(Boolean).join(' · ') || 'Toàn bộ thị trường'} · Bộ lọc áp dụng cho độ rộng và Top list</small></div></div>
      {leaders.map(([label, items, field]) => <section className="breadth-leader" key={label}><strong>{label}</strong><small>{field === 'change' ? 'Xếp theo % biến động mới nhất' : 'Xếp theo khối lượng mới nhất'}</small><small className="breadth-leader-timestamp">{metrics.latestQuoteAt ? `Quote gần nhất ${formatDateTime(metrics.latestQuoteAt)}` : 'Chưa có thời điểm quote intraday'}</small>{items.length ? <ol>{items.map(row => <li key={row.symbol}><button type="button" data-breadth-symbol={row.symbol} title={`Mở Chi tiết mã ${row.symbol} · ${row.quote ? `Intraday ${formatDateTime(row.observedAt) || ''}` : 'EOD fallback'}`} aria-label={`Mở Chi tiết mã ${row.symbol}`} onClick={() => onOpenDetail?.(row.stock)}><span>{row.symbol}</span><small className={`breadth-leader-source ${row.quote ? 'intraday' : 'eod'}`}>{row.quote ? 'Intraday' : 'EOD'}</small></button><b>{field === 'change' ? `${row.change >= 0 ? '+' : ''}${row.change.toFixed(2)}%` : compact(row.volume)}</b></li>)}</ol> : <p>Chưa có dữ liệu</p>}</section>)}
    </div>
    <MarketBreadthHistory exchange={exchange} sector={sector} sectorLabel={selectedSectorLabel} language={language} />
    <p className="breadth-disclaimer">Phân loại dùng biến động giá mới nhất{exchange || sector ? ` trong phạm vi ${[exchange, selectedSectorLabel].filter(Boolean).join(' · ')}` : ''}; nguồn hiện tại không tách khối lượng chủ động bên mua và bên bán.</p>
  </section>
}
