import { useMemo } from 'react'

const symbolOf = value => String(value?.symbol || value?.code || value?.stock_code || '').toUpperCase()
const quoteFor = (quotes, symbol) => quotes[symbol] || quotes[symbol.toUpperCase()] || null
const formatPrice = (value, language) => Number.isFinite(Number(value))
  ? new Intl.NumberFormat(language === 'en' ? 'en-US' : 'vi-VN', { maximumFractionDigits: 0 }).format(Number(value))
  : '—'
const formatObservedAt = (value, language) => value && Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value))
  : null
const OVERVIEW_LIMIT = 8

export default function OverviewWatchlistPulse({ entries = [], stocks = [], quotes = {}, onOpenDetail, onOpenWatchlist, language = 'vi' }) {
  const text = (vi, en) => language === 'en' ? en : vi
  const rows = useMemo(() => entries.map(entry => {
    const stored = entry.Stock || entry.stock || {}
    const symbol = symbolOf(stored) || symbolOf(entry)
    const stock = stocks.find(item => symbolOf(item) === symbol) || stored
    const quote = quoteFor(quotes, symbol)
    const change = Number(quote?.change ?? stock?.change)
    const price = quote?.price ?? stock?.price
    return { entry, stock, symbol, quote, change, price }
  }).filter(row => row.symbol).sort((left, right) => Math.abs(right.change || 0) - Math.abs(left.change || 0) || left.symbol.localeCompare(right.symbol)).slice(0, OVERVIEW_LIMIT), [entries, stocks, quotes])
  const liveCount = rows.filter(row => row.quote).length
  const latestObservedAt = rows.reduce((latest, row) => !row.quote?.observed_at || (latest && Date.parse(latest) >= Date.parse(row.quote.observed_at)) ? latest : row.quote.observed_at, null)

  if (!rows.length) return null

  return <aside className="panel overview-watchlist-pulse" aria-labelledby="overview-watchlist-pulse-title" lang={language}>
    <div className="overview-watchlist-heading">
      <div><span className="eyebrow accent">WATCHLIST</span><h3 id="overview-watchlist-pulse-title">{text('Mã bạn theo dõi', 'Your watchlist')}</h3></div>
      <span className="chip neutral" aria-label={text(`Hiển thị ${rows.length} trên ${entries.length} mã`, `Showing ${rows.length} of ${entries.length} symbols`)}>{rows.length}/{entries.length}</span>
    </div>
    <p className="overview-watchlist-intro">{text('Các mã biến động nhiều nhất trong danh sách theo dõi của bạn.', 'The most changed symbols in your personal watchlist.')}</p>
    <p className="overview-watchlist-data-status" role="status">{liveCount ? `${liveCount}/${rows.length} ${text('mã có quote Intraday', 'symbols have intraday quotes')}${latestObservedAt ? ` · ${text('ghi nhận', 'observed')} ${formatObservedAt(latestObservedAt, language)}` : ''}` : text('Đang dùng giá EOD gần nhất cho các mã đang hiển thị.', 'The shown symbols use their latest EOD price.')}</p>
    <ul className="overview-watchlist-list">
      {rows.map(row => <li key={row.entry.stock_id || row.symbol}>
        <button type="button" onClick={() => onOpenDetail?.(row.stock)} aria-label={`${text('Mở Chi tiết mã', 'Open stock details')} ${row.symbol}`}>
          <span><strong>{row.symbol}</strong><small>{row.quote ? 'Intraday' : 'EOD'}</small></span>
          <span className="overview-watchlist-quote"><b>{formatPrice(row.price, language)}</b><em className={Number.isFinite(row.change) && row.change < 0 ? 'negative' : Number.isFinite(row.change) && row.change > 0 ? 'positive' : ''}>{Number.isFinite(row.change) ? `${row.change > 0 ? '+' : ''}${row.change.toFixed(2)}%` : '—'}</em></span>
        </button>
      </li>)}
    </ul>
    <button type="button" className="ghost-btn small-btn overview-watchlist-manage" onClick={onOpenWatchlist}>{entries.length > rows.length ? text(`Xem toàn bộ ${entries.length} mã`, `View all ${entries.length} symbols`) : text('Quản lý Watchlist', 'Manage watchlist')}</button>
  </aside>
}
