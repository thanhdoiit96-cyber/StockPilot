import { useState } from 'react'

const number = value => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 }).format(Number(value || 0))
const money = value => value == null ? '-' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 }).format(Number(value || 0))
const dateTime = value => {
  const date = new Date(value)
  return value && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(date) : '-'
}
const openDetail = (event, position, callback) => {
  if (event && event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return
  event?.preventDefault()
  callback?.(position.stock_id)
}

function PositionRow({ position, onOpenDetail }) {
  return <tr className="portfolio-row-clickable" role="link" tabIndex="0" aria-label={`Mở Chi tiết mã ${position.symbol}`} onClick={event => openDetail(event, position, onOpenDetail)} onKeyDown={event => openDetail(event, position, onOpenDetail)}>
    <td><button type="button" className="symbol portfolio-detail-link" title={`Mở Chi tiết mã ${position.symbol}`} onClick={event => { event.stopPropagation(); onOpenDetail?.(position.stock_id) }}>{position.symbol}</button></td>
    <td>{number(position.quantity)}</td><td>{money(position.avg_cost)}</td>
    <td>{money(position.market_price)}<small className="data-time">{position.quote ? `Intraday · ${dateTime(position.quote.observed_at)}` : 'EOD fallback'}</small></td>
    <td className={Number(position.unrealized_pnl) >= 0 ? 'positive' : 'negative'}>{money(position.unrealized_pnl)}</td>
    <td className={Number(position.realized_pnl) >= 0 ? 'positive' : 'negative'}>{money(position.realized_pnl)}</td>
  </tr>
}

function ClosedPositionRow({ position, onOpenDetail }) {
  return <tr className="portfolio-row-clickable" role="link" tabIndex="0" aria-label={`Mở Chi tiết mã ${position.symbol}`} onClick={event => openDetail(event, position, onOpenDetail)} onKeyDown={event => openDetail(event, position, onOpenDetail)}>
    <td><button type="button" className="symbol portfolio-detail-link" title={`Mở Chi tiết mã ${position.symbol}`} onClick={event => { event.stopPropagation(); onOpenDetail?.(position.stock_id) }}>{position.symbol}</button>{position.name ? <small>{position.name}</small> : null}</td>
    <td><span className="chip neutral">Đã đóng</span></td><td>{dateTime(position.closed_at)}</td>
    <td className={Number(position.realized_pnl) >= 0 ? 'positive' : 'negative'}>{money(position.realized_pnl)}</td>
  </tr>
}

export default function PortfolioPositions({ positions = [], closedPositions = [], loading = false, error = '', onOpenDetail }) {
  const [filter, setFilter] = useState('open')
  const closed = filter === 'closed'
  const rows = closed ? closedPositions : positions
  return <section className="portfolio-positions" aria-labelledby="portfolio-positions-title">
    <div className="portfolio-positions-heading">
      <div><h3 id="portfolio-positions-title">Vị thế danh mục</h3><p className="muted-text">Phân tách mã đang nắm giữ và mã đã bán hết theo ledger.</p></div>
      <div className="portfolio-position-filters" role="group" aria-label="Lọc trạng thái vị thế">
        <button type="button" className={filter === 'open' ? 'active' : ''} aria-pressed={filter === 'open'} onClick={() => setFilter('open')}>Đang mở <span>{positions.length}</span></button>
        <button type="button" className={closed ? 'active' : ''} aria-pressed={closed} onClick={() => setFilter('closed')}>Đã đóng <span>{closedPositions.length}</span></button>
      </div>
    </div>
    <div className="table-wrap portfolio-table">
      <table aria-label={closed ? 'Vị thế đã đóng' : 'Vị thế đang mở'}>
        {closed ? <><thead><tr><th>Mã</th><th>Trạng thái</th><th>Đóng gần nhất</th><th>Lãi/lỗ đã thực hiện</th></tr></thead><tbody>{rows.map(position => <ClosedPositionRow key={position.stock_id} position={position} onOpenDetail={onOpenDetail} />)}{!loading && !error && !rows.length ? <tr><td colSpan="4">Chưa có vị thế đã đóng</td></tr> : null}</tbody></> : <><thead><tr><th>Mã</th><th>Số lượng</th><th>Giá vốn</th><th>Giá hiện tại</th><th>Lãi/lỗ chưa thực hiện</th><th>Lãi/lỗ đã thực hiện</th></tr></thead><tbody>{rows.map(position => <PositionRow key={position.stock_id} position={position} onOpenDetail={onOpenDetail} />)}{!loading && !error && !rows.length ? <tr><td colSpan="6">Chưa có vị thế đang mở</td></tr> : null}</tbody></>}
      </table>
    </div>
  </section>
}
