import { useId, useState } from 'react'

const COLORS = ['#5eead4', '#60a5fa', '#fbbf24', '#f472b6', '#a78bfa', '#34d399']
const money = value => `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(value || 0))} ₫`

function annularPath(startPercent, endPercent) {
  const point = (radius, degrees) => {
    const radians = degrees * Math.PI / 180
    return { x: 50 + radius * Math.cos(radians), y: 50 + radius * Math.sin(radians) }
  }
  const startDegrees = startPercent * 3.6 - 90
  const span = Math.min((endPercent - startPercent) * 3.6, 359.999)
  const endDegrees = startDegrees + span
  const outerStart = point(49, startDegrees)
  const outerEnd = point(49, endDegrees)
  const innerEnd = point(35, endDegrees)
  const innerStart = point(35, startDegrees)
  const largeArc = span > 180 ? 1 : 0
  return `M ${outerStart.x} ${outerStart.y} A 49 49 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A 35 35 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y} Z`
}

export default function PortfolioAllocation({ allocations = [], positions = [], quoteCount = 0, positionCount = 0, quoteError = false, providerStatus }) {
  const [tooltip, setTooltip] = useState(null)
  const tooltipId = useId().replaceAll(':', '')
  const total = allocations.reduce((sum, item) => sum + Number(item.market_value || 0), 0)
  const previousTotal = positions.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.previous_market_price || 0), 0)
  const change = previousTotal > 0 ? total - previousTotal : null
  const percent = change == null ? null : change / previousTotal * 100
  const rag = change == null || change === 0 ? 'amber' : change > 0 ? 'green' : 'red'
  const signedMoney = change == null ? '' : `${change >= 0 ? '+' : '-'}${money(Math.abs(change))}`
  const signedPercent = percent == null ? '' : `${percent >= 0 ? '+' : '-'}${new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(percent))}%`
  let cursor = 0
  const slices = allocations.map((item, index) => {
    const start = cursor
    cursor += Number(item.weight || 0)
    return { ...item, index, start, end: cursor }
  })
  const coverage = `${quoteCount}/${positionCount} mã có quote intraday`

  return <article className="panel allocation-panel">
    <div className="allocation-panel-heading"><div><h3>Phân bổ danh mục</h3><p className="muted-text">Tỷ trọng theo giá trị thị trường hiện tại.</p></div><span className="chip neutral">{allocations.length} mã</span></div>
    {allocations.length ? <div className="allocation-visual">
      <div className="allocation-donut" aria-label="Biểu đồ phân bổ danh mục" style={{ background: `conic-gradient(${slices.map(slice => `${COLORS[slice.index % COLORS.length]} ${slice.start.toFixed(2)}% ${slice.end.toFixed(2)}%`).join(', ')})` }}>
        <div><small className="allocation-total-label">Tổng giá trị</small><strong className="allocation-total-value">{money(total)}</strong><small className="allocation-day-change" data-rag={rag} data-data-quality={quoteCount < positionCount ? 'partial' : 'complete'}>So với hôm qua: <span data-rag={rag} className={rag === 'green' ? 'positive' : rag === 'red' ? 'negative' : 'neutral'}>{change == null ? 'Chưa đủ dữ liệu' : `${signedMoney} ${signedPercent}`}</span></small></div>
        <svg className="allocation-donut-interaction-svg" viewBox="0 0 100 100" aria-label="Tỷ trọng từng cổ phiếu trong danh mục">
          {slices.map(slice => {
            const label = `${slice.symbol}: ${Number(slice.weight).toFixed(1)}%, ${money(slice.market_value)}`
            return <path key={slice.stock_id || slice.symbol} d={annularPath(slice.start, slice.end)} tabIndex="0" role="img" data-symbol={slice.symbol} aria-label={label} aria-describedby={tooltipId} onPointerEnter={() => setTooltip(slice)} onPointerLeave={() => setTooltip(null)} onFocus={() => setTooltip(slice)} onBlur={() => setTooltip(null)}><title>{label}</title></path>
          })}
        </svg>
        <output id={tooltipId} className="allocation-donut-tooltip" role="tooltip" hidden={!tooltip}><strong>{tooltip?.symbol}</strong><span>{tooltip ? `${Number(tooltip.weight).toFixed(1)}%` : ''}</span><small>{tooltip ? money(tooltip.market_value) : ''}</small></output>
      </div>
      <ol className="allocation-list">{slices.map(slice => <li title={`${slice.symbol}: ${Number(slice.weight).toFixed(1)}% · ${money(slice.market_value)}`} key={slice.stock_id || slice.symbol}><div className="allocation-item-heading"><i style={{ backgroundColor: COLORS[slice.index % COLORS.length] }} /><div><strong>{slice.symbol}</strong><small>{money(slice.market_value)}</small></div><b>{Number(slice.weight).toFixed(1)}%</b></div><div className="allocation-track"><span style={{ width: `${slice.weight}%`, backgroundColor: COLORS[slice.index % COLORS.length] }} /></div></li>)}</ol>
    </div> : <p className="muted-text">Chưa có dữ liệu phân bổ.</p>}
    <p className="allocation-footnote">{coverage} · {quoteError || quoteCount < positionCount ? 'Mã thiếu quote dùng giá EOD; tỷ trọng kết hợp dữ liệu hiện có.' : 'Tỷ trọng dựa trên quote intraday mới nhất.'}{providerStatus === 'circuit_open' ? ' Provider tạm ngắt, sẽ tự thử lại.' : providerStatus === 'degraded' ? ' Provider đang chậm.' : ''}</p>
    <aside className="portfolio-data-audit" aria-label="Kiểm tra dữ liệu danh mục"><strong>Kiểm tra dữ liệu danh mục</strong><p>{coverage}</p><p>Chênh lệch = tổng giá trị hiện tại − tổng (số lượng × giá đóng cửa phiên trước).</p><div className="portfolio-data-audit-legend" aria-label="Chú giải RAG"><span><i className="rag-green" />Tăng</span><span><i className="rag-red" />Giảm</span><span><i className="rag-amber" />Chưa đủ dữ liệu</span></div></aside>
  </article>
}
