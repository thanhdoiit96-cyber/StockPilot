import { useRef, useState } from 'react'
import { translate } from '../services/i18n.mjs'

export default function QuickWatchlistButton({ symbol, watched = false, onAdd, className = '', language = 'vi' }) {
  const t = key => translate(language, key, { code })
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
      setState({ status: 'success', message: '' })
    } catch (error) {
      setState({ status: 'error', message: error?.message || t('watch.quick.error') })
    } finally { locked.current = false }
  }
  const saved = watched || state.status === 'success'
  const icon = saved ? '★' : state.status === 'loading' ? '…' : state.status === 'error' ? '!' : '☆'
  const label = t(saved ? 'watch.quick.saved' : state.status === 'loading' ? 'watch.quick.loading' : state.status === 'error' ? 'watch.quick.retry' : 'watch.quick.add')
  return <button type="button" className={`ghost-btn small-btn quick-watchlist-btn${saved ? ' is-watched' : ''}${state.status === 'error' ? ' has-error' : ''}${className ? ` ${className}` : ''}`} disabled={!code || saved || state.status === 'loading'} aria-label={label} aria-live="polite" title={state.message || label} onClick={add}><span aria-hidden="true">{icon}</span></button>
}
