const money = value => value == null ? 'Chưa đủ dữ liệu' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value))
const percent = value => value == null ? 'Chưa đủ dữ liệu' : `${Number(value) >= 0 ? '+' : ''}${new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))}%`
const tone = value => value == null || Number(value) === 0 ? 'neutral' : Number(value) > 0 ? 'positive' : 'negative'

export default function PortfolioPerformance({ performance, positions, loading = false }) {
  if (loading) return <section className="panel performance-panel" aria-busy="true"><p className="muted-text">Đang tính hiệu suất từ nhật ký giao dịch…</p></section>
  if (!performance || performance.status === 'empty') return <section className="panel performance-panel" aria-labelledby="performance-title"><div className="performance-heading"><div><span className="eyebrow accent">HIỆU SUẤT ĐẦU TƯ</span><h3 id="performance-title">Bắt đầu từ giao dịch đầu tiên</h3></div><span className="chip neutral">Chưa có dữ liệu</span></div><p className="muted-text">Ghi nhận giao dịch mua hoặc bán để xem lãi/lỗ được tính từ giá vốn thực tế.</p></section>
  const livePositions = Array.isArray(positions) ? positions : null
  const pricedPositions = livePositions?.filter(item => item.market_value != null && Number.isFinite(Number(item.market_value)))
  const liveComplete = livePositions ? pricedPositions.length === livePositions.length : performance.status === 'complete'
  const liveUnrealized = liveComplete && livePositions ? livePositions.reduce((sum, item) => sum + Number(item.unrealized_pnl || 0), 0) : performance.unrealized_pnl
  const liveTotal = liveUnrealized == null ? null : Number(performance.realized_pnl || 0) + liveUnrealized
  const liveMarketValue = liveComplete && livePositions ? livePositions.reduce((sum, item) => sum + Number(item.market_value || 0), 0) : performance.market_value
  const liveReturn = liveTotal == null || Number(performance.total_cost_basis) <= 0 ? null : liveTotal / Number(performance.total_cost_basis) * 100
  const complete = liveComplete
  return <section className="panel performance-panel" aria-labelledby="performance-title">
    <div className="performance-heading"><div><span className="eyebrow accent">HIỆU SUẤT ĐẦU TƯ</span><h3 id="performance-title">Kết quả theo giá vốn</h3><p className="muted-text">Ảnh chụp toàn bộ giao dịch đã ghi nhận, không phải TWR/MWR.</p></div><span className={`chip ${complete ? 'success' : 'warning'}`}>{complete ? 'Đủ giá hiện tại' : 'Thiếu giá hiện tại'}</span></div>
    <div className="performance-hero"><div><small>Tổng lãi/lỗ</small><strong className={tone(liveTotal)}>{money(liveTotal)}</strong><span className={tone(liveReturn)}>{percent(liveReturn)} trên giá vốn</span></div><div className="performance-value"><small>Giá trị hiện tại</small><b>{money(liveMarketValue)}</b><span>{pricedPositions?.length ?? performance.coverage?.priced_positions ?? 0}/{livePositions?.length ?? performance.coverage?.open_positions ?? 0} vị thế có giá</span></div></div>
    <dl className="performance-breakdown"><div><dt>Đã thực hiện</dt><dd className={tone(performance.realized_pnl)}>{money(performance.realized_pnl)}</dd></div><div><dt>Chưa thực hiện</dt><dd className={tone(liveUnrealized)}>{money(liveUnrealized)}</dd></div><div><dt>Tổng giá vốn</dt><dd>{money(performance.total_cost_basis)}</dd></div></dl>
    <p className="performance-note">Phương pháp giá vốn bình quân đã gồm phí giao dịch. Chưa tính dòng tiền nạp/rút, cổ tức và corporate action; ứng dụng chưa công bố TWR/MWR cho đến khi có đủ dữ liệu.</p>
  </section>
}
