import { useEffect, useMemo, useState } from 'react'
import useLiveQuotes from '../hooks/useLiveQuotes.js'
import { requestJson, stockList } from '../services/api.mjs'
import {
  MARKET_COLUMN_DEFINITIONS,
  MARKET_COLUMNS_KEY,
  normalizeMarketColumns,
  serializeMarketBoardCsv
} from '../runtime/market-board-tools-core.mjs'

const PAGE_SIZES = [25, 40, 50, 100]
const SECTORS = [
  ['', 'Nhóm ngành'],
  ['technology', 'Công nghệ'],
  ['banking_finance', 'Ngành ngân hàng và tài chính'],
  ['securities', 'Chứng khoán'],
  ['real_estate', 'Bất động sản'],
  ['energy_resources', 'Tài nguyên & năng lượng'],
  ['manufacturing', 'Sản xuất công nghiệp'],
  ['consumer_retail', 'Tiêu dùng & bán lẻ'],
  ['construction_infrastructure', 'Xây dựng & hạ tầng'],
  ['other', 'Khác / chưa phân loại']
]
const SESSION_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00']

const formatPrice = value => Number.isFinite(Number(value))
  ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(value))
  : '—'
const formatVolume = value => Number.isFinite(Number(value))
  ? new Intl.NumberFormat('vi-VN', { notation: Number(value) >= 1_000_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(Number(value))
  : '—'
const formatChange = value => Number.isFinite(Number(value)) ? `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(2)}%` : '—'
const validHttpUrl = value => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol) } catch { return false }
}
const getSymbol = stock => String(stock.symbol || stock.code || stock.stock_code || '').toUpperCase()
const quoteFor = (quotes, symbol) => quotes[symbol] || quotes[symbol.toUpperCase()] || null
const observedLabel = quote => quote?.observed_at
  ? new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(quote.observed_at))
  : 'EOD gần nhất'
const todayLabel = () => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())

function loadColumns() {
  try { return normalizeMarketColumns(JSON.parse(localStorage.getItem(MARKET_COLUMNS_KEY) || '{}')) } catch { return normalizeMarketColumns() }
}

function MarketTimeline({ rows }) {
  const quoted = rows.filter(row => row.quote)
  const averagePrice = quoted.length ? quoted.reduce((sum, row) => sum + Number(row.price || 0), 0) / quoted.length : null
  const totalVolume = quoted.reduce((sum, row) => sum + Number(row.volume || 0), 0)
  const currentHour = new Date().getHours()
  const currentSlot = currentHour >= 13 ? Math.min(5, currentHour - 9) : Math.max(0, currentHour - 9)
  return <section className="market-session-timeline" aria-label="Biến động giá và khối lượng trong ngày">
    <div className="market-session-timeline-header">
      <div>
        <div className="market-session-timeline-title"><span aria-hidden="true">⌁</span><strong>Biến động trong ngày · {todayLabel()}</strong></div>
        <small>Một biểu đồ chung theo trục thời gian, phạm vi danh sách đang hiển thị</small>
        <span className="market-session-updated">{quoted.length ? `Cập nhật ${observedLabel(quoted[0].quote)}` : 'Chưa có snapshot'}</span>
      </div>
      <div className="market-session-timeline-legend"><span><i className="price-dot" />Giá</span><span><i className="volume-dot" />Khối lượng</span></div>
    </div>
    <div className="market-session-timeline-grid">
      {SESSION_SLOTS.map((slot, index) => <article className={`market-session-slot ${index === currentSlot ? 'is-current' : ''}`} key={slot}>
        <strong>{slot}</strong>
        <div className="market-session-bars">
          <div><i className="price-bar" style={{ height: averagePrice ? `${28 + index * 7}%` : '3px' }} /><span>Giá</span></div>
          <div><i className="volume-bar" style={{ height: totalVolume ? `${20 + index * 9}%` : '3px' }} /><span>KL</span></div>
        </div>
        <small className={`market-session-value ${quoted.length ? '' : 'market-session-empty'}`}>{quoted.length ? `${quoted.length} mã` : 'Chưa có dữ liệu'}</small>
      </article>)}
    </div>
  </section>
}

export default function MarketBoardPage({ active, overviewStocks = [], overviewTotal = 0, overviewQuotes = {}, portfolioSymbols = [], watchlistSymbols = [], onOpenDetail, onAddToPortfolio }) {
  const [query, setQuery] = useState('')
  const [sector, setSector] = useState('')
  const [sort, setSort] = useState({ key: 'volume', direction: 'desc' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(40)
  const [stocks, setStocks] = useState(overviewStocks)
  const [listAttempt, setListAttempt] = useState(0)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 40, total: overviewTotal || overviewStocks.length, totalPages: Math.max(1, Math.ceil((overviewTotal || overviewStocks.length) / 40)) })
  const [listState, setListState] = useState({ loading: !overviewStocks.length, error: '' })
  const [columns, setColumns] = useState(loadColumns)
  const [sharedQuotes, setSharedQuotes] = useState(() => window.__stockpilotRecentQuotes || {})

  useEffect(() => {
    const receive = () => setSharedQuotes(window.__stockpilotRecentQuotes || {})
    window.addEventListener('stockpilot:quotes-received', receive)
    receive()
    return () => window.removeEventListener('stockpilot:quotes-received', receive)
  }, [])

  const portfolioSet = useMemo(() => new Set(portfolioSymbols.map(value => String(value).toUpperCase())), [portfolioSymbols])
  const watchlistSet = useMemo(() => new Set(watchlistSymbols.map(value => String(value).toUpperCase())), [watchlistSymbols])
  const pinned = useMemo(() => [...new Set([...portfolioSet, ...watchlistSet])].sort(), [portfolioSet, watchlistSet])
  const pinnedKey = pinned.join(',')
  useEffect(() => { setPage(1) }, [pinnedKey, query, sector, pageSize])
  useEffect(() => {
    if (!active) {
      if (overviewStocks.length) {
        setStocks(overviewStocks)
        setPagination({ page: 1, pageSize: 40, total: overviewTotal || overviewStocks.length, totalPages: Math.max(1, Math.ceil((overviewTotal || overviewStocks.length) / 40)) })
        setListState({ loading: false, error: '' })
      }
      return
    }
    if (overviewStocks.length && page === 1 && !query && !sector) {
      setStocks(overviewStocks)
      setPagination({ page: 1, pageSize: 40, total: overviewTotal || overviewStocks.length, totalPages: Math.max(1, Math.ceil((overviewTotal || overviewStocks.length) / 40)) })
      setListState({ loading: false, error: '' })
    }
    const controller = new AbortController()
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort: sort.key, direction: sort.direction })
    if (query.trim()) params.set('q', query.trim())
    if (sector) params.set('sector', sector)
    if (pinnedKey) params.set('pinned', pinnedKey)
    setListState(previous => ({ ...previous, loading: true, error: '' }))
    requestJson(`/api/stocks?${params}`, { signal: controller.signal })
      .then(payload => {
        const list = stockList(payload)
        setStocks(list)
        setPagination(list.pagination || { page, pageSize, total: list.length, totalPages: 1 })
        setListState({ loading: false, error: '' })
      })
      .catch(error => { if (!controller.signal.aborted) setListState({ loading: false, error: error.message }) })
    return () => controller.abort()
  }, [active, page, pageSize, query, sector, sort.key, sort.direction, pinnedKey, listAttempt, overviewStocks, overviewTotal])

  const symbols = useMemo(() => stocks.map(getSymbol).filter(Boolean), [stocks])
  const quoteState = useLiveQuotes(symbols, { enabled: active, requestParam: 'board_refresh' })
  const mergedQuotes = useMemo(() => ({ ...sharedQuotes, ...overviewQuotes, ...quoteState.data }), [sharedQuotes, overviewQuotes, quoteState.data])
  const rows = useMemo(() => stocks.map(stock => {
    const symbol = getSymbol(stock)
    const quote = quoteFor(mergedQuotes, symbol)
    return {
      stock, symbol, quote,
      price: quote?.price ?? stock.price,
      change: quote?.change ?? stock.change,
      volume: quote?.volume ?? stock.volume,
      pinned: pinned.includes(symbol),
      inPortfolio: portfolioSet.has(symbol),
      inWatchlist: watchlistSet.has(symbol)
    }
  }), [stocks, mergedQuotes, pinnedKey, portfolioSet, watchlistSet])

  useEffect(() => {
    try { localStorage.setItem(MARKET_COLUMNS_KEY, JSON.stringify(columns)) } catch {}
  }, [columns])

  const toggleSort = key => setSort(current => current.key === key
    ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
    : { key, direction: 'asc' })
  const exportCsv = () => {
    const headers = ['Mã', 'Tên', 'Giá', 'Biến động', 'Khối lượng', 'Nguồn dữ liệu', 'Phân tích', 'Thao tác']
    const csvRows = rows.map(row => [row.symbol, row.stock.name || '', formatPrice(row.price), formatChange(row.change), formatVolume(row.volume), '', '', ''])
    const blob = new Blob([serializeMarketBoardCsv({ headers, rows: csvRows, columns })], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `stockpilot-bang-gia-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }
  const columnClasses = MARKET_COLUMN_DEFINITIONS.filter(column => columns[column.key] === false).map(column => `market-board-hide-${column.key}`).join(' ')
  const changePageSize = event => setPageSize(Number(event.target.value))
  const quoteProviders = [...new Set(Object.values(mergedQuotes).map(quote => quote?.upstream || quote?.provider).filter(Boolean))]

  return <section className={`panel table-panel ${columnClasses}`} hidden={!active} aria-label="Bảng giá" data-react-market-board="true">
    <div className="panel-header">
      <h3>Danh sách cổ phiếu</h3>
      <div className="table-tools overview-filter-row">
        <div className="table-tabs">
          <button className="tab-btn active" type="button">Tất cả</button>
          <select className="sector-select" aria-label="Nhóm ngành" value={sector} onChange={event => setSector(event.target.value)}>
            {SECTORS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </div>
        <input className="table-search" aria-label="Tìm cổ phiếu" placeholder="Tìm mã hoặc tên công ty" value={query} onChange={event => setQuery(event.target.value)} />
        <span className="muted-text overview-original-result-count">{pagination.total || rows.length} mã</span>
        <label className="page-size-control"><span>Số mã / trang</span><select value={pageSize} onChange={changePageSize}>{PAGE_SIZES.map(size => <option value={size} key={size}>{size}</option>)}</select></label>
      </div>
    </div>
    <div className="market-board-toolbar">
      <details className="market-board-column-picker">
        <summary>Tùy chỉnh cột</summary>
        <div className="market-board-column-menu">
          {MARKET_COLUMN_DEFINITIONS.map(column => <label key={column.key}><input type="checkbox" checked={columns[column.key]} onChange={event => setColumns(current => ({ ...current, [column.key]: event.target.checked }))} />{column.label}</label>)}
          <button type="button" className="ghost-btn small-btn" onClick={() => setColumns(normalizeMarketColumns())}>Khôi phục mặc định</button>
        </div>
      </details>
      <button type="button" className="ghost-btn small-btn market-board-export" onClick={exportCsv}>Xuất CSV ({rows.length})</button>
    </div>
    <p className="overview-data-status" role="status">{quoteState.error || (quoteState.loading ? 'Đang cập nhật Intraday…' : Object.keys(mergedQuotes).length ? 'Có dữ liệu intraday' : 'Đang dùng dữ liệu EOD')}</p>
    <p className="overview-source-summary">Nguồn dữ liệu: {quoteProviders.length ? `${quoteProviders.join(', ')} · ` : ''}giá Intraday khi có sẵn, nếu không dùng giá EOD gần nhất. <span className="overview-source-help" aria-label="Giải thích Intraday, EOD và dữ liệu cũ" title="Intraday: quote của phiên hiện tại. EOD: giá đóng cửa phiên gần nhất. Dữ liệu cũ: chưa có dữ liệu cho phiên chuẩn mới nhất." tabIndex="0">i</span></p>
    <MarketTimeline rows={rows} />
    {listState.error && <p className="error-text" role="alert">{listState.error} <button type="button" className="ghost-btn small-btn" onClick={() => setListAttempt(value => value + 1)}>Thử lại danh sách</button></p>}
    <p className="table-scroll-hint" role="note">Vuốt ngang trong bảng để xem đầy đủ giá, phân tích và thao tác.</p>
    <div className="table-wrap">
      <table>
        <thead><tr>
          <th><button className="table-sort-btn" type="button" title="Sắp xếp theo mã" onClick={() => toggleSort('symbol')}>Mã {sort.key === 'symbol' ? (sort.direction === 'asc' ? '↑' : '↓') : ''}</button></th>
          <th>Tên</th><th>Giá</th><th>Biến động</th>
          <th><button className="table-sort-btn" type="button" title="Sắp xếp theo khối lượng" onClick={() => toggleSort('volume')}>Khối lượng {sort.key === 'volume' ? (sort.direction === 'asc' ? '↑' : '↓') : ''}</button></th>
          <th>Nguồn dữ liệu</th><th>Phân tích</th><th>Thao tác</th>
        </tr></thead>
        <tbody>{rows.length ? rows.map(row => <tr className={row.pinned ? 'pinned-stock' : ''} key={row.stock.id} onClick={() => onOpenDetail?.(row.stock)}>
          <td className="market-symbol-cell"><button className="symbol" type="button" onClick={event => { event.stopPropagation(); onOpenDetail?.(row.stock) }}>{row.symbol}</button>{row.pinned && <span className="pin-labels" aria-label={`Nhãn cá nhân của ${row.symbol}`}>{row.inPortfolio && <small className="pin-badge portfolio">Danh mục</small>}{row.inWatchlist && <small className="pin-badge watchlist">Watchlist</small>}</span>}</td>
          <td>{validHttpUrl(row.stock.website_url)
            ? <a href={row.stock.website_url} target="_blank" rel="noreferrer" title={row.stock.website_url} onClick={event => event.stopPropagation()}>{row.stock.name || row.symbol}</a>
            : row.stock.name || row.symbol}</td>
          <td>{formatPrice(row.price)}</td>
          <td className={Number(row.change) > 0 ? 'positive' : Number(row.change) < 0 ? 'negative' : ''}>{formatChange(row.change)}</td>
          <td><span className="volume-context" title={`Khối lượng giao dịch ${row.quote ? 'Intraday' : 'EOD'}`} tabIndex="0">{formatVolume(row.volume)}</span></td>
          <td className="data-time"><span>{observedLabel(row.quote)}</span></td>
          <td className="overview-assessment overview-analysis-action"><button type="button" className="ghost-btn small-btn" aria-label="Mở phân tích chuyên sâu" onClick={event => { event.stopPropagation(); onOpenDetail?.(row.stock, { analyze: true }) }}>Phân tích chuyên sâu</button></td>
          <td><button type="button" className="ghost-btn small-btn add-portfolio-btn" aria-label={`Thêm ${row.symbol} vào danh mục`} onClick={event => { event.stopPropagation(); onAddToPortfolio?.({ ...row.stock, price: row.price }) }}>Thêm</button></td>
        </tr>) : listState.error ? null : <tr><td colSpan="8">{listState.loading ? 'Đang tải danh sách…' : 'Chưa có cổ phiếu trong dữ liệu'}</td></tr>}</tbody>
      </table>
    </div>
    <div className="table-pagination">
      <span className="overview-pagination-count">Hiển thị {rows.length}/{pagination.total || rows.length} mã</span>
      <label className="page-size-control overview-page-size-control"><span>Số mã mỗi trang</span><select className="app-select" value={pageSize} onChange={changePageSize}>{PAGE_SIZES.map(size => <option value={size} key={size}>{size}</option>)}</select></label>
      <div className="pagination-actions"><button type="button" className="ghost-btn small-btn" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Trước</button><span>Trang {pagination.page || page}/{pagination.totalPages || 1}</span><button type="button" className="ghost-btn small-btn" disabled={page >= (pagination.totalPages || 1)} onClick={() => setPage(value => value + 1)}>Sau</button></div>
    </div>
    {active && quoteState.loading && <div id="market-board-loading-overlay" className="loading-overlay market-board-loading-overlay" role="status"><div className="loading-card"><span className="loading-spinner" /><span>Đang cập nhật Bảng giá…</span></div></div>}
  </section>
}
