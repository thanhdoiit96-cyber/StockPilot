import { useEffect, useMemo, useRef, useState } from 'react'
import { getChartWindow } from '../services/chartWindow.mjs'

export default function DetailPriceVolumeChart({ history = [], marketSessions = [], formatDateKey, formatTime, formatPrice, formatVolume, formatPercent, translate = value => value }) {
  const [range, setRange] = useState(12)
  const [offset, setOffset] = useState(0)
  const [activePoint, setActivePoint] = useState(null)
  const chartRef = useRef(null)
  const window = useMemo(() => getChartWindow(history, range, offset), [history, range, offset])
  const visible = window.items
  useEffect(() => {
    setOffset(current => Math.min(current, Math.max(0, history.length - range)))
    setActivePoint(null)
  }, [history.length, range])
  const prices = visible.map(item => Number(item.close ?? item.price)).filter(Number.isFinite)
  const volumes = visible.map(item => Number(item.volume)).filter(Number.isFinite)
  const maxVolume = Math.max(1, ...volumes)
  const minPrice = Math.min(...prices, 0)
  const maxPrice = Math.max(...prices, 1)
  const priceSpan = Math.max(1, maxPrice - minPrice)
  const points = visible.map((item, index) => {
    const value = Number(item.close ?? item.price)
    return {
      item,
      index,
      value,
      x: visible.length <= 1 ? 300 : (index + .5) * 600 / visible.length,
      y: 18 + (maxPrice - (Number.isFinite(value) ? value : minPrice)) / priceSpan * 154
    }
  })
  const latest = [...visible].reverse().find(item => Number.isFinite(Number(item.close ?? item.price)))
  const latestIndex = latest ? visible.lastIndexOf(latest) : -1
  const latestPrice = latest ? Number(latest.close ?? latest.price) : null
  const previousPrice = latestIndex > 0 ? Number(visible[latestIndex - 1].close ?? visible[latestIndex - 1].price) : null
  const change = latestPrice != null && Number.isFinite(previousPrice) && previousPrice !== 0 ? (latestPrice / previousPrice - 1) * 100 : null
  const high = visible.reduce((value, item) => Math.max(value, Number(item.high ?? item.close ?? item.price) || 0), 0)
  const low = visible.reduce((value, item) => Math.min(value, Number(item.low ?? item.close ?? item.price) || Number.POSITIVE_INFINITY), Number.POSITIVE_INFINITY)
  const availableSessions = new Set(history.map(item => formatDateKey(item.observed_at)))
  const missingSessions = marketSessions.filter(session => !availableSessions.has(session))
  const dataGap = missingSessions.length > 0 && <p className="chart-data-gap" role="note">Phiên gần đây có dữ liệu trong hệ thống nhưng chưa có nến EOD cho mã này: {missingSessions.map(session => `${session.slice(8, 10)}-${session.slice(5, 7)}`).join(', ')}. Biểu đồ chỉ hiển thị dữ liệu giá ghi nhận được.</p>
  const showPoint = (item, kind, trigger) => setActivePoint({ item, kind, trigger })
  const moveFocus = (selector, index, direction) => {
    const targets = [...(chartRef.current?.querySelectorAll(selector) || [])]
    targets[(index + direction + targets.length) % targets.length]?.focus()
  }
  const pointKeys = (event, selector, index) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      moveFocus(selector, index, event.key === 'ArrowRight' ? 1 : -1)
    } else if (event.key === 'Escape') {
      setActivePoint(null)
      event.currentTarget.blur()
    }
  }
  const chooseRange = value => { setRange(value); setOffset(0) }
  const zoom = direction => setRange(current => Math.max(3, Math.min(history.length || 3, current + direction * 2)))
  const pan = direction => setOffset(current => {
    const step = Math.max(1, Math.floor(range / 2))
    return Math.max(0, Math.min(Math.max(0, history.length - range), current + direction * step))
  })

  if (!visible.length) return <>{dataGap}<div className="chart-empty-state" role="status">Chưa có lịch sử giá từ nguồn dữ liệu cho mã này.</div></>

  return <>
    {dataGap}
    <div className="chart-navigation-controls"><div className="chart-range-controls" role="group" aria-label={translate('Số phiên hiển thị')}><span>{translate('Phiên')}</span>{[5, 10, 12].map(value => <button type="button" className={range === value && offset === 0 ? 'active' : ''} onClick={() => chooseRange(value)} key={value}>{value}</button>)}</div><div className="chart-zoom-controls" role="group" aria-label="Zoom và dịch biểu đồ"><button type="button" disabled={range <= 3} onClick={() => zoom(-1)} aria-label="Phóng to biểu đồ">＋</button><button type="button" disabled={range >= history.length} onClick={() => zoom(1)} aria-label="Thu nhỏ biểu đồ">−</button><button type="button" disabled={!window.hasOlder} onClick={() => pan(1)}>Cũ hơn</button><span aria-live="polite">Phiên {window.total ? window.start + 1 : 0}–{window.end}/{window.total}</span><button type="button" disabled={!window.hasNewer} onClick={() => pan(-1)}>Mới hơn</button></div></div>
    <div className="combined-price-volume-chart" data-testid="combined-price-volume-chart" ref={chartRef} onMouseLeave={() => setActivePoint(current => current?.trigger === 'mouse' ? null : current)}>
      {activePoint ? <div className="detail-chart-tooltip" id="detail-chart-tooltip" role="tooltip"><strong>{formatTime(activePoint.item.observed_at)}</strong><span>{activePoint.item.interval === 'intraday' ? translate('Giá intraday hiện tại') : translate('Đóng cửa')}: {formatPrice(activePoint.item.close ?? activePoint.item.price)}</span><span>{translate('Mở cửa')}: {formatPrice(activePoint.item.open)} · {translate('Cao')}: {formatPrice(activePoint.item.high)} · {translate('Thấp')}: {formatPrice(activePoint.item.low)}</span><span>KL: {formatVolume(activePoint.item.volume)}{activePoint.item.provider ? ` · ${activePoint.item.provider}` : ''}</span></div> : null}
      <div className="price-chart" aria-label={translate('Biểu đồ giá đóng cửa')}>
        <svg viewBox="0 0 600 190" preserveAspectRatio="none" role="img" aria-label={translate('Đường giá đóng cửa theo phiên')}>
          {[18, 70, 121, 172].map(value => <line x1="0" x2="600" y1={value} y2={value} className="price-grid-line" key={value} />)}
          {points.length > 0 && <polyline points={points.map(point => `${point.x},${point.y}`).join(' ')} className="price-line" fill="none" />}
          {points.map(point => <circle key={`${point.item.observed_at || point.index}-point`} cx={point.x} cy={point.y} data-session-date={formatDateKey(point.item.observed_at)} r={point.item.interval === 'intraday' ? '5' : '4'} className={point.item.interval === 'intraday' ? 'price-point current' : 'price-point'} tabIndex="0" aria-label={`${formatTime(point.item.observed_at)} - ${formatPrice(point.value)}`} aria-describedby={activePoint?.item === point.item ? 'detail-chart-tooltip' : undefined} onMouseEnter={() => showPoint(point.item, 'price', 'mouse')} onFocus={() => showPoint(point.item, 'price', 'focus')} onBlur={() => setActivePoint(null)} onKeyDown={event => pointKeys(event, '.price-point', point.index)}><title>{`${formatTime(point.item.observed_at)}  ${point.item.interval === 'intraday' ? translate('Giá intraday hiện tại') : translate('Đóng cửa')}: ${formatPrice(point.value)}  ${translate('Mở cửa')}: ${formatPrice(point.item.open)}  ${translate('Cao')}: ${formatPrice(point.item.high)}  ${translate('Thấp')}: ${formatPrice(point.item.low)}  KL: ${formatVolume(point.item.volume)}${point.item.provider ? `  ${point.item.provider}` : ''}${point.item.fetched_at ? `  ${translate('Cập nhật lúc')}: ${formatTime(point.item.fetched_at)}` : ''}`}</title></circle>)}
        </svg>
        <div className="price-axis-labels">{visible.map((item, index) => { const date = formatDateKey(item.observed_at); return <small data-session-date={date} key={`${item.observed_at || index}-label`}>{date.slice(5, 10) || '--'}</small> })}</div>
      </div>
      <div className="volume-scale" aria-label={translate('Thang đo khối lượng')}><span>{translate('KL cổ phiếu cao nhất')}: {formatVolume(maxVolume)}</span><span>0</span></div>
      <div className="detail-volume-bars" data-testid="detail-volume-bars" aria-label={translate('Khối lượng theo phiên')}>{visible.map((item, index) => {
        const volume = Number(item.volume)
        const prior = visible[index - 1]
        const rising = index === 0 || Number(item.close ?? item.price) >= Number(prior?.close ?? prior?.price)
        return <span data-session-date={formatDateKey(item.observed_at)} className={rising ? 'volume-bar rising' : 'volume-bar falling'} style={{ height: `${Number.isFinite(volume) ? Math.max(8, volume / maxVolume * 52) : 8}px` }} tabIndex="0" aria-label={`${formatTime(item.observed_at)} - ${formatVolume(item.volume)}`} aria-describedby={activePoint?.item === item ? 'detail-chart-tooltip' : undefined} onMouseEnter={() => showPoint(item, 'volume', 'mouse')} onFocus={() => showPoint(item, 'volume', 'focus')} onBlur={() => setActivePoint(null)} onKeyDown={event => pointKeys(event, '.detail-volume-bars .volume-bar', index)} title={`${formatTime(item.observed_at)} - ${formatVolume(item.volume)} ${translate('cổ phiếu')}`} key={`${item.observed_at || index}-volume`}><i /></span>
      })}</div>
      <div className="chart-legend" role="group" aria-label={translate('Chú giải biểu đồ')}><span className="chart-legend-item"><i className="legend-price" /><strong>{translate('Giá đóng cửa')}</strong></span><span className="chart-legend-item"><i className="legend-volume-rising" /><strong>{translate('Khối lượng phiên tăng')}</strong></span><span className="chart-legend-item"><i className="legend-volume-falling" /><strong>{translate('Khối lượng phiên giảm')}</strong></span></div>
    </div>
    <div className="chart-summary"><span><small>{translate('Mới nhất')}</small><strong>{formatPrice(latestPrice)}</strong><em className={change == null || change >= 0 ? 'positive' : 'negative'}>{formatPercent(change)}</em></span><span><small>{translate('Cao nhất')}</small><strong>{formatPrice(high || null)}</strong></span><span><small>{translate('Thấp nhất')}</small><strong>{formatPrice(Number.isFinite(low) ? low : null)}</strong></span><span><small>{translate('Khối lượng mới nhất')}</small><strong>{formatVolume(latest?.volume)}</strong><em>{formatTime(latest?.observed_at)}</em></span></div>
  </>
}
