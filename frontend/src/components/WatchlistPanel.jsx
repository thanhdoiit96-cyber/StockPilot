import { useMemo, useRef, useState } from 'react'
import { matchesSearch } from '../services/positionSearch.mjs'

export default function WatchlistPanel({ entries = [], addValue, onAddValueChange, onAdd, onOpenDetail, onRemove }) {
  const [query, setQuery] = useState('')
  const [confirmCode, setConfirmCode] = useState('')
  const searchRef = useRef(null)
  const visible = useMemo(() => entries.filter(entry => matchesSearch([entry.Stock?.code, entry.Stock?.name], query)), [entries, query])
  return <article className="panel watchlist-panel" aria-labelledby="watchlist-title">
    <div className="watchlist-heading"><div><h3 id="watchlist-title">Watchlist</h3><p className="muted-text">Theo dõi nhanh các mã bạn quan tâm.</p></div><span className="chip neutral">{entries.length} mã</span></div>
    <form onSubmit={onAdd} className="auth-form watchlist-add-form">
      <label htmlFor="watchlist-add">Thêm mã theo dõi</label>
      <div><input id="watchlist-add" placeholder="Ví dụ: FPT" value={addValue} onChange={event => onAddValueChange(event.target.value.toUpperCase())} /><button className="primary-btn" type="submit">Thêm mã</button></div>
    </form>
    <div className="watchlist-search">
      <label htmlFor="watchlist-search">Tìm trong Watchlist<input ref={searchRef} id="watchlist-search" type="search" value={query} onChange={event => { setQuery(event.target.value); setConfirmCode('') }} placeholder="Mã hoặc tên doanh nghiệp" /></label>
      {query && <button type="button" className="ghost-btn" onClick={() => { setQuery(''); setConfirmCode(''); searchRef.current?.focus() }}>Xóa tìm kiếm</button>}
      <span role="status">{visible.length}/{entries.length} mã hiển thị</span>
    </div>
    <ul className="watchlist">
      {visible.map(entry => {
        const stock = entry.Stock || {}
        const removing = confirmCode === stock.code
        return <li key={entry.stock_id}>
          <div className="watchlist-company"><strong>{stock.code}</strong>{stock.name && <small>{stock.name}</small>}</div>
          {removing ? <div className="watchlist-confirm" role="group" aria-label={`Xác nhận xóa ${stock.code}`}><span>Xóa khỏi Watchlist?</span><button type="button" className="ghost-btn small-btn" onClick={() => setConfirmCode('')}>Hủy</button><button type="button" className="danger-btn small-btn" onClick={() => { setConfirmCode(''); onRemove(stock.code) }}>Xác nhận xóa</button></div> : <div className="watchlist-actions"><button type="button" className="ghost-btn small-btn" disabled={!stock.id} onClick={() => onOpenDetail(stock.id)}>Mở chi tiết</button><button type="button" className="ghost-btn small-btn" onClick={() => setConfirmCode(stock.code)} aria-label={`Xóa ${stock.code} khỏi Watchlist`}>Xóa</button></div>}
        </li>
      })}
      {!entries.length && <li className="muted-text watchlist-empty">Chưa có mã theo dõi. Thêm mã ở phía trên để bắt đầu.</li>}
    </ul>
    {entries.length > 0 && !visible.length && <p role="status" className="muted-text">Không có mã phù hợp. Thử mã hoặc tên khác, hoặc xóa tìm kiếm.</p>}
  </article>
}
