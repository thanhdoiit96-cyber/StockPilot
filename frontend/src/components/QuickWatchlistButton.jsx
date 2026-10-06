import { useRef, useState } from 'react'

export default function QuickWatchlistButton({ symbol, watched = false, onAdd, className = '' }) {
  const [state, setState] = useState({ status: 'idle', message: '' })
  const locked = useRef(false)
  const code = String(symbol || '').trim().toUpperCase()
  const add = async event => {
    event.stopPropagation()
    if (!code || watched || locked.current) return
    locked.current = true
    setState({ status: 'loading', message: '' })
    try {
      await onAdd?.(code)
      setState({ status: 'success', message: `${code} đã có trong Watchlist.` })
    } catch (error) {
      setState({ status: 'error', message: error?.message || `Không thể thêm ${code} vào Watchlist.` })
    } finally { locked.current = false }
  }
  const saved = watched || state.status === 'success'
  const icon = saved ? '★' : state.status === 'loading' ? '…' : state.status === 'error' ? '!' : '☆'
  const label = saved ? `${code} đã có trong Watchlist` : state.status === 'loading' ? `Đang thêm ${code} vào Watchlist` : state.status === 'error' ? `Thử thêm lại ${code} vào Watchlist` : `Thêm ${code} vào Watchlist`
  return <button type="button" className={`ghost-btn small-btn quick-watchlist-btn${saved ? ' is-watched' : ''}${state.status === 'error' ? ' has-error' : ''}${className ? ` ${className}` : ''}`} disabled={!code || saved || state.status === 'loading'} aria-label={label} aria-live="polite" title={state.message || label} onClick={add}><span aria-hidden="true">{icon}</span></button>
}
