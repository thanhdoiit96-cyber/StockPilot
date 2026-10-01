import { useEffect, useMemo, useState } from 'react'
import { requestJson } from '../services/api.mjs'

const money = value => value == null
  ? 'Chưa có dữ liệu'
  : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 }).format(Number(value || 0))

const sessionDate = value => {
  if (!value) return ''
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(value))
  const pick = type => parts.find(part => part.type === type)?.value || ''
  return `${pick('year')}-${pick('month')}-${pick('day')}`
}

const observedTime = value => value
  ? new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).format(new Date(value))
  : ''

const normalizeHistory = detail => (detail?.price_history || []).flatMap(item => {
  const price = Number(item.close ?? item.price)
  const date = sessionDate(item.observed_at ?? item.price_date)
  if (!date || !Number.isFinite(price)) return []
  return [{
    date,
    observedAt: item.observed_at ?? item.price_date,
    price,
    volume: Number(item.volume || 0),
    current: false,
    source: item.upstream || item.provider || item.data_source || ''
  }]
})

function CombinedPriceVolumeChart({ detail, quote }) {
  const [range, setRange] = useState(20)
  const allPoints = useMemo(() => {
    const byDate = new Map(normalizeHistory(detail).map(point => [point.date, point]))
    const quotePrice = Number(quote?.price)
    const quoteDate = sessionDate(quote?.observed_at)
    if (quoteDate && Number.isFinite(quotePrice)) {
      byDate.set(quoteDate, {
        date: quoteDate,
        observedAt: quote.observed_at,
        price: quotePrice,
        volume: Number(quote.volume || 0),
        current: true,
        source: quote.upstream || quote.provider || ''
      })
    }
    return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date))
  }, [detail, quote])
  const points = allPoints.slice(-range)
  const missingSessions = (detail?.market_sessions || []).filter(date => !allPoints.some(point => point.date === date))

  if (!points.length) return <div className="chart-empty-state">Chưa có lịch sử giá từ nguồn dữ liệu cho mã này.</div>

  const prices = points.map(point => point.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const span = Math.max(max - min, 1)
  const maxVolume = Math.max(...points.map(point => point.volume), 1)
  const coordinates = points.map((point, index) => ({
    ...point,
    x: points.length === 1 ? 50 : index / (points.length - 1) * 100,
    y: 10 + (max - point.price) / span * 75
  }))
  const average = prices.reduce((sum, value) => sum + value, 0) / prices.length

  return <>
    {missingSessions.length > 0 && <div className="chart-data-gap">Thiếu nến cho phiên {missingSessions.map(date => date.slice(5)).join(', ')}; biểu đồ chỉ hiển thị điểm có dữ liệu.</div>}
    <div className="combined-price-volume-chart" data-testid="combined-price-volume-chart">
      <div className="chart-range-controls"><span>Phạm vi</span>{[5, 20, 60].map(value => <button key={value} type="button" className={range === value ? 'active' : ''} onClick={() => setRange(value)}>{value}</button>)}</div>
      <div className="price-chart">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Biểu đồ giá">
          {[20, 50, 80].map(y => <line className="price-grid-line" key={y} x1="0" x2="100" y1={y} y2={y} />)}
          <polyline className="price-line" fill="none" points={coordinates.map(point => `${point.x},${point.y}`).join(' ')} />
          {coordinates.map(point => <circle key={point.date} className={`price-point${point.current ? ' current' : ''}`} data-session-date={point.date} cx={point.x} cy={point.y} r="3" tabIndex="0">
            <title>{`${point.date} ${observedTime(point.observedAt)} · ${money(point.price)}${point.source ? ` · ${point.source}` : ''}`}</title>
          </circle>)}
        </svg>
      </div>
      <div className="detail-volume-bars">{coordinates.map((point, index) => <span
        key={point.date}
        className={`volume-bar ${index === 0 || point.price >= coordinates[index - 1].price ? 'rising' : 'falling'}`}
        data-session-date={point.date}
        style={{ height: `${Math.max(5, point.volume / maxVolume * 100)}%` }}
        tabIndex="0"
        title={`${point.date}: ${new Intl.NumberFormat('vi-VN').format(point.volume)}`}
      />)}</div>
      <div className="price-axis-labels">{coordinates.map(point => <small key={point.date} data-session-date={point.date}>{point.date.slice(5)}</small>)}</div>
      <div className="chart-legend"><span className="chart-legend-item">Khối lượng phiên tăng</span><span className="chart-legend-item">Khối lượng phiên giảm</span><span className="chart-legend-item">Điểm vàng: Intraday hiện tại</span></div>
    </div>
    <div className="chart-summary"><span><small>Thấp nhất</small><strong>{money(min)}</strong></span><span><small>Cao nhất</small><strong>{money(max)}</strong></span><span><small>Trung bình</small><strong>{money(average)}</strong></span><span><small>Số phiên</small><strong>{points.length}</strong></span></div>
  </>
}

export default function DetailWorkspace({ detail, selectedId, stocks, onSelectId, onAddWatchlist, children }) {
  const [lookup, setLookup] = useState('')
  const [lookupError, setLookupError] = useState('')
  const [quote, setQuote] = useState(null)

  useEffect(() => {
    let cancelled = false
    setQuote(null)
    if (!selectedId) return () => { cancelled = true }
    const load = () => requestJson(`/api/stocks/${encodeURIComponent(selectedId)}/quote`)
      .then(payload => {
        const candidate = payload?.data
        if (!cancelled && Number.isFinite(Number(candidate?.price)) && candidate?.observed_at) setQuote(candidate)
      })
      .catch(() => {})
    load()
    const timer = window.setInterval(load, 30000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [selectedId])

  const openSymbol = event => {
    event.preventDefault()
    const symbol = lookup.trim().toUpperCase()
    const match = stocks.find(stock => stock.symbol.toUpperCase() === symbol)
    if (!match) { setLookupError(`Không tìm thấy mã ${symbol || 'đã nhập'}`); return }
    setLookupError('')
    onSelectId(match.id)
  }

  if (detail.loading) return <section className="detail-page"><div className="loading-shell"><p>Đang tải chi tiết cổ phiếu</p></div></section>
  if (detail.error) return <section className="detail-page"><div className="error-banner" role="alert"><p>Không thể tải chi tiết cổ phiếu. {detail.error}</p><button className="ghost-btn" onClick={detail.retry}>Thử lại chi tiết</button></div></section>
  if (!detail.data) return <section className="detail-page"><div className="empty-state">Chưa chọn mã cổ phiếu.</div></section>

  const currentPrice = Number.isFinite(Number(quote?.price)) ? Number(quote.price) : detail.data.price
  return <section className="detail-page">
    <div className="detail-hero panel">
      <div><h2>{detail.data.code} {detail.data.name}</h2><p>Nguồn: {quote?.upstream || detail.data.data_source || 'Chưa có dữ liệu'}</p></div>
      <strong>{money(currentPrice)}</strong>
      <form className="detail-symbol-lookup" onSubmit={openSymbol}><input id="detail-symbol-input" aria-label="Mã chi tiết" value={lookup} onChange={event => setLookup(event.target.value.toUpperCase())} placeholder="Nhập mã" /><button className="ghost-btn" type="submit">Xem mã</button></form>
      <button className="ghost-btn detail-add-btn" type="button" onClick={onAddWatchlist}>Thêm mã vào watchlist</button>
      {lookupError && <p className="error-text" role="alert">{lookupError}</p>}
    </div>
    <section className="panel detail-chart-panel"><div className="panel-header"><div><p className="eyebrow accent">Lịch sử giá</p><h3>Giá và khối lượng theo phiên</h3></div></div><CombinedPriceVolumeChart detail={detail.data} quote={quote} /></section>
    {children}
  </section>
}
