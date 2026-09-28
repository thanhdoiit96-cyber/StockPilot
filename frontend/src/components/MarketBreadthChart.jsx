import React, { useMemo } from 'react'

const formatNumber = (value) => new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0))
const formatDateTime = (value) => value && Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value))
  : 'Chưa có quote'

const categories = [
  { key: 'up', label: 'Tăng giá', color: 'up' },
  { key: 'down', label: 'Giảm giá', color: 'down' },
  { key: 'flat', label: 'Đứng giá', color: 'flat' },
]

export default function MarketBreadthChart({ stocks = [], quotes = {} }) {
  const summary = useMemo(() => {
    const result = { up: { count: 0, volume: 0 }, down: { count: 0, volume: 0 }, flat: { count: 0, volume: 0 }, unknown: 0, quoted: 0, averageChange: null, latestQuoteAt: null }
    const changes = []
    for (const stock of stocks) {
      const quote = quotes[stock.symbol || stock.code]
      if (quote) {
        result.quoted += 1
        if (!result.latestQuoteAt || Date.parse(quote.observed_at) > Date.parse(result.latestQuoteAt)) result.latestQuoteAt = quote.observed_at
      }
      const rawChange = quote?.change ?? stock.change
      const change = Number(rawChange)
      if (rawChange == null || !Number.isFinite(change)) { result.unknown += 1; continue }
      changes.push(change)
      const key = change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
      result[key].count += 1
      const volume = Number(quote?.volume_type === 'session' ? quote.volume : NaN)
      if (Number.isFinite(volume) && volume > 0) result[key].volume += volume
    }
    result.averageChange = changes.length ? changes.reduce((sum, value) => sum + value, 0) / changes.length : null
    result.classified = result.up.count + result.down.count + result.flat.count
    result.spread = result.up.count - result.down.count
    result.adRatio = result.down.count > 0 ? result.up.count / result.down.count : null
    result.classifiedPercent = stocks.length ? result.classified / stocks.length * 100 : 0
    result.totalVolume = result.up.volume + result.down.volume + result.flat.volume
    result.maxVolume = Math.max(1, result.up.volume, result.down.volume, result.flat.volume)
    const ranked = stocks.map((stock) => {
      const quote = quotes[stock.symbol || stock.code] || {}
      return { symbol: stock.symbol || stock.code, change: Number(quote.change ?? stock.change), volume: Number(quote.volume ?? stock.volume) }
    }).filter(item => item.symbol)
    result.topUp = ranked.filter(item => Number.isFinite(item.change)).sort((a, b) => b.change - a.change).slice(0, 5)
    result.topDown = ranked.filter(item => Number.isFinite(item.change)).sort((a, b) => a.change - b.change).slice(0, 5)
    result.topVolume = ranked.filter(item => Number.isFinite(item.volume) && item.volume > 0).sort((a, b) => b.volume - a.volume).slice(0, 5)
    return result
  }, [stocks, quotes])

  return <section className="panel market-breadth-panel" aria-labelledby="market-breadth-heading">
    <div className="panel-header market-breadth-header">
      <div><h3 id="market-breadth-heading">Độ rộng thị trường</h3><p className="muted-text">{stocks.length} mã trong vi trụ · {summary.quoted}/{stocks.length} mã có quote intraday · cập nhật gần nhất {formatDateTime(summary.latestQuoteAt)}</p></div>
      <span className="chip neutral"><span className={summary.averageChange != null && summary.averageChange < 0 ? 'negative' : 'positive'}>{summary.averageChange == null ? 'Chưa đủ dữ liệu' : `Biến động bình quân ${summary.averageChange >= 0 ? '+' : ''}${summary.averageChange.toFixed(2)}%`}</span></span>
    </div>
    <div className="breadth-counts">{categories.map((category) => <article className={`breadth-count ${category.color}`} key={category.key}><span>{category.label}</span><strong>{summary[category.key].count}</strong><small>{summary.classified ? `${(summary[category.key].count / summary.classified * 100).toFixed(1)}% số mã` : 'Chưa có dữ liệu'}</small></article>)}</div>
    <div className="breadth-snapshot" aria-label="Chỉ số snapshot độ rộng thị trường">
      <div><span>A/D ratio</span><strong>{summary.adRatio == null ? '—' : summary.adRatio.toFixed(2)}</strong><small>Tăng / giảm</small></div>
      <div><span>Chênh lệch A−D</span><strong className={summary.spread >= 0 ? 'positive' : 'negative'}>{summary.spread > 0 ? '+' : ''}{summary.spread}</strong><small>Mã tăng trừ mã giảm</small></div>
      <div><span>Đã phân loại</span><strong>{summary.classifiedPercent.toFixed(1)}%</strong><small>{summary.unknown ? `${summary.unknown} mã thiếu biến động` : 'Đủ dữ liệu biến động'}</small></div>
    </div>
    <div className="breadth-leaders" aria-label="Các mã dẫn dắt thị trường">
      {[['Top tăng', 'topUp', 'positive', 'change'], ['Top giảm', 'topDown', 'negative', 'change'], ['Top khối lượng', 'topVolume', 'neutral', 'volume']].map(([label, key, tone, field]) => <section className="breadth-leader" key={key}><strong>{label}</strong><small>Trong universe đang theo dõi</small>{summary[key].length ? <ol>{summary[key].map(item => <li key={item.symbol}><span>{item.symbol}</span><b className={tone}>{field === 'change' ? `${item.change >= 0 ? '+' : ''}${item.change.toFixed(2)}%` : formatNumber(item.volume)}</b></li>)}</ol> : <p>Chưa có dữ liệu</p>}</section>)}
    </div>
    {summary.classified > 0 && <div className="breadth-distribution" role="img" aria-label={`Độ rộng: tăng ${summary.up.count}, giảm ${summary.down.count}, đứng giá ${summary.flat.count}`}>{categories.map((category) => <span key={category.key} className={`breadth-segment ${category.color}`} style={{ width: `${summary[category.key].count / summary.classified * 100}%` }} title={`${category.label}: ${summary[category.key].count}`} />)}</div>}
    <div className="breadth-volume-heading"><strong>Khối lượng phiên theo nhóm biến động</strong><span>{formatNumber(summary.totalVolume)} cổ phiếu</span></div>
    <div className="breadth-volume-chart" role="img" aria-label="Khối lượng phiên của các mã tăng giá, giảm giá và đứng giá">{categories.map((category) => <div className="breadth-volume-column" key={category.key} title={`${category.label}: ${formatNumber(summary[category.key].volume)} cổ phiếu`}><div className="breadth-volume-track"><span className={category.color} style={{ height: `${summary[category.key].volume / summary.maxVolume * 100}%` }} /></div><strong>{formatNumber(summary[category.key].volume)}</strong><small>{category.label}</small></div>)}</div>
    <p className="breadth-disclaimer">Phân loại dựa trên biến động giá mới nhất; khối lượng chỉ dùng quote intraday theo phiên. {summary.unknown > 0 && `${summary.unknown} mã chưa có biến động để phân loại.`}</p>
  </section>
}
