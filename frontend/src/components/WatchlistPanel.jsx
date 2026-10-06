import { useMemo, useRef, useState } from 'react'
import { matchesSearch } from '../services/positionSearch.mjs'

export default function WatchlistPanel({ entries = [], addValue, onAddValueChange, onAdd, onOpenDetail, onRemove }) {
  const [query, setQuery] = useState('')
  const [confirmCode, setConfirmCode] = useState('')
  const [mutation, setMutation] = useState({ type: '', code: '', message: '', error: false })
  const mutationLock = useRef(false)
  const searchRef = useRef(null)
  const visible = useMemo(() => entries.filter(entry => matchesSearch([entry.Stock?.code, entry.Stock?.name], query)), [entries, query])
  const busy = mutation.type === 'adding' || mutation.type === 'removing'
  const add = async event => {
    event.preventDefault()
    if (mutationLock.current || !addValue.trim()) return
    const code = addValue.trim().toUpperCase()
    mutationLock.current = true
    setMutation({ type: 'adding', code, message: '', error: false })
    try {
      await onAdd(event)
      setMutation({ type: '', code, message: `Đã thêm ${code} vào Watchlist.`, error: false })
    } catch (error) {
      setMutation({ type: '', code, message: error?.message || `Không thể thêm ${code}.`, error: true })
    } finally { mutationLock.current = false }
  }
  const remove = async code => {
    if (mutationLock.current) return
    mutationLock.current = true
    setMutation({ type: 'removing', code, message: '', error: false })
    try {
      await onRemove(code)
      setConfirmCode('')
      setMutation({ type: '', code, message: `Đã xóa ${code} khỏi Watchlist.`, error: false })
    } catch (error) {
      setMutation({ type: '', code, message: error?.message || `Không thể xóa ${code}.`, error: true })
    } finally { mutationLock.current = false }
  }
  return <article className="panel watchlist-panel" aria-labelledby="watchlist-title">
    <div className="watchlist-heading"><div><h3 id="watchlist-title">Watchlist</h3><p className="muted-text">Theo dõi nhanh các mã bạn quan tâm.</p></div><span className="chip neutral">{entries.length} mã</span></div>
    <form onSubmit={add} className="auth-form watchlist-add-form" aria-busy={mutation.type === 'adding'}>
      <label htmlFor="watchlist-add">Thêm mã theo dõi</label>
      <div><input id="watchlist-add" placeholder="Ví dụ: FPT" value={addValue} disabled={busy} onChange={event => { onAddValueChange(event.target.value.toUpperCase()); setMutation({ type: '', code: '', message: '', error: false }) }} /><button className="primary-btn" type="submit" disabled={busy || !addValue.trim()}>{mutation.type === 'adding' ? `Đang thêm ${mutation.code}…` : 'Thêm mã'}</button></div>
    </form>
    {mutation.message && <p className={mutation.error ? 'watchlist-mutation error' : 'watchlist-mutation success'} role={mutation.error ? 'alert' : 'status'}>{mutation.message}</p>}
    <div className="watchlist-search">
      <label className="search-field-label" htmlFor="watchlist-search">Tìm trong Watchlist<input ref={searchRef} className="app-search-input" id="watchlist-search" type="search" value={query} onChange={event => { setQuery(event.target.value); setConfirmCode('') }} placeholder="Mã hoặc tên doanh nghiệp" /></label>
      {query && <button type="button" className="ghost-btn small-btn search-clear-btn" disabled={busy} onClick={() => { setQuery(''); setConfirmCode(''); searchRef.current?.focus() }}>Xóa tìm kiếm</button>}
      <span className="search-result-count" role="status">{visible.length}/{entries.length} mã hiển thị</span>
    </div>
    <ul className="watchlist">
      {visible.map(entry => {
        const stock = entry.Stock || {}
        const removing = confirmCode === stock.code
        return <li key={entry.stock_id}>
          <div className="watchlist-company"><strong>{stock.code}</strong>{stock.name && <small>{stock.name}</small>}</div>
          {removing ? <div className="watchlist-confirm" role="group" aria-label={`Xác nhận xóa ${stock.code}`} aria-busy={mutation.type === 'removing' && mutation.code === stock.code}><span>Xóa khỏi Watchlist?</span><button type="button" className="ghost-btn small-btn" disabled={busy} onClick={() => setConfirmCode('')}>Hủy</button><button type="button" className="danger-btn small-btn" disabled={busy} onClick={() => remove(stock.code)}>{mutation.type === 'removing' && mutation.code === stock.code ? 'Đang xóa…' : 'Xác nhận xóa'}</button></div> : <div className="watchlist-actions"><button type="button" className="ghost-btn small-btn" disabled={busy || !stock.id} onClick={() => onOpenDetail(stock.id)}>Mở chi tiết</button><button type="button" className="ghost-btn small-btn" disabled={busy} onClick={() => { setConfirmCode(stock.code); setMutation({ type: '', code: '', message: '', error: false }) }} aria-label={`Xóa ${stock.code} khỏi Watchlist`}>Xóa</button></div>}
        </li>
      })}
      {!entries.length && <li className="muted-text watchlist-empty">Chưa có mã theo dõi. Thêm mã ở phía trên để bắt đầu.</li>}
    </ul>
    {entries.length > 0 && !visible.length && <p role="status" className="muted-text">Không có mã phù hợp. Thử mã hoặc tên khác, hoặc xóa tìm kiếm.</p>}
  </article>
}
