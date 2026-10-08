import { useMemo, useRef, useState } from 'react'
import { matchesSearch } from '../services/positionSearch.mjs'
import StockDetailLink from './StockDetailLink.jsx'
import { translate } from '../services/i18n.mjs'
import { filterWatchlist, sortWatchlist, watchlistIndustries, watchlistStatusCounts } from '../services/watchlistView.mjs'
import { formatDateTime } from '../services/userLocale.mjs'

export default function WatchlistPanel({ entries = [], addValue, onAddValueChange, onAdd, onOpenDetail, onRemove, onUpdateMetadata, language = 'vi', timezone = 'Asia/Ho_Chi_Minh' }) {
  const t = (key, values) => translate(language, key, values)
  const [query, setQuery] = useState('')
  const [industry, setIndustry] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('recent')
  const [confirmCode, setConfirmCode] = useState('')
  const [editingCode, setEditingCode] = useState('')
  const [draft, setDraft] = useState({ status: 'WATCHING', note: '' })
  const [mutation, setMutation] = useState({ type: '', code: '', message: '', error: false })
  const mutationLock = useRef(false)
  const searchRef = useRef(null)
  const industries = useMemo(() => watchlistIndustries(entries, language), [entries, language])
  const statusCounts = useMemo(() => watchlistStatusCounts(entries), [entries])
  const visible = useMemo(() => sortWatchlist(filterWatchlist(entries.filter(entry => matchesSearch([entry.Stock?.code, entry.Stock?.name, entry.note], query)), industry, status), sort, language), [entries, query, industry, status, sort, language])
  const hasViewFilters = Boolean(query || industry || status || sort !== 'recent')
  const busy = mutation.type === 'adding' || mutation.type === 'removing' || mutation.type === 'updating'
  const add = async event => {
    event.preventDefault()
    if (mutationLock.current || !addValue.trim()) return
    const code = addValue.trim().toUpperCase()
    mutationLock.current = true
    setMutation({ type: 'adding', code, message: '', error: false })
    try {
      await onAdd(event)
      setMutation({ type: '', code, message: t('portfolio.watchlist.added', { code }), error: false })
    } catch (error) {
      setMutation({ type: '', code, message: error?.message || t('portfolio.watchlist.addError', { code }), error: true })
    } finally { mutationLock.current = false }
  }
  const remove = async code => {
    if (mutationLock.current) return
    mutationLock.current = true
    setMutation({ type: 'removing', code, message: '', error: false })
    try {
      await onRemove(code)
      setConfirmCode('')
      setMutation({ type: '', code, message: t('portfolio.watchlist.removed', { code }), error: false })
    } catch (error) {
      setMutation({ type: '', code, message: error?.message || t('portfolio.watchlist.removeError', { code }), error: true })
    } finally { mutationLock.current = false }
  }
  const edit = entry => {
    setConfirmCode('')
    setEditingCode(entry.Stock?.code || '')
    setDraft({ status: entry.status || 'WATCHING', note: entry.note || '' })
    setMutation({ type: '', code: '', message: '', error: false })
  }
  const saveMetadata = async code => {
    if (mutationLock.current || !onUpdateMetadata) return
    mutationLock.current = true
    setMutation({ type: 'updating', code, message: '', error: false })
    try {
      await onUpdateMetadata(code, draft)
      setEditingCode('')
      setMutation({ type: '', code, message: t('portfolio.watchlist.metadataSaved', { code }), error: false })
    } catch (error) {
      setMutation({ type: '', code, message: error?.message || t('portfolio.watchlist.metadataError', { code }), error: true })
    } finally { mutationLock.current = false }
  }
  return <article className="panel watchlist-panel" aria-labelledby="watchlist-title" lang={language}>
    <div className="watchlist-heading"><div><h3 id="watchlist-title">Watchlist</h3><p className="muted-text">{t('portfolio.watchlist.subtitle')}</p></div><span className="chip neutral">{entries.length} {t('portfolio.common.symbols')}</span></div>
    <form onSubmit={add} className="auth-form watchlist-add-form" aria-busy={mutation.type === 'adding'}>
      <label htmlFor="watchlist-add">{t('portfolio.watchlist.addLabel')}</label>
      <div><input id="watchlist-add" placeholder={t('portfolio.watchlist.placeholder')} value={addValue} disabled={busy} onChange={event => { onAddValueChange(event.target.value.toUpperCase()); setMutation({ type: '', code: '', message: '', error: false }) }} /><button className="primary-btn" type="submit" disabled={busy || !addValue.trim()}>{mutation.type === 'adding' ? `${t('portfolio.watchlist.adding')} ${mutation.code}…` : t('portfolio.watchlist.add')}</button></div>
    </form>
    {mutation.message && <p className={mutation.error ? 'watchlist-mutation error' : 'watchlist-mutation success'} role={mutation.error ? 'alert' : 'status'}>{mutation.message}</p>}
    <div className="watchlist-search">
      <label className="search-field-label" htmlFor="watchlist-search">{t('portfolio.watchlist.search')}<input ref={searchRef} className="app-search-input" id="watchlist-search" type="search" value={query} onChange={event => { setQuery(event.target.value); setConfirmCode('') }} placeholder={t('portfolio.watchlist.searchPlaceholder')} /></label>
      {query && <button type="button" className="ghost-btn small-btn search-clear-btn" disabled={busy} onClick={() => { setQuery(''); setConfirmCode(''); searchRef.current?.focus() }}>{t('portfolio.watchlist.clear')}</button>}
      <span className="search-result-count" role="status">{visible.length}/{entries.length} {t('portfolio.watchlist.visible')}</span>
    </div>
    <div className="watchlist-status-summary" role="group" aria-label={t('portfolio.watchlist.statusSummary')}>
      {[['', entries.length, 'allStatuses'], ['WATCHING', statusCounts.WATCHING, 'status.WATCHING'], ['RESEARCHING', statusCounts.RESEARCHING, 'status.RESEARCHING'], ['PAUSED', statusCounts.PAUSED, 'status.PAUSED']].map(([value, count, key]) => <button type="button" key={value || 'all'} className={status === value ? 'active' : ''} aria-pressed={status === value} onClick={() => { setStatus(value); setConfirmCode('') }}><span>{t(`portfolio.watchlist.${key}`)}</span><strong>{count}</strong></button>)}
    </div>
    <div className="watchlist-view-controls" aria-label={t('portfolio.watchlist.viewControls')}>
      <label>{t('portfolio.watchlist.industry')}<select value={industry} onChange={event => { setIndustry(event.target.value); setConfirmCode('') }}><option value="">{t('portfolio.watchlist.allIndustries')}</option>{industries.map(value => <option value={value} key={value}>{value}</option>)}</select></label>
      <label>{t('portfolio.watchlist.statusFilter')}<select value={status} onChange={event => { setStatus(event.target.value); setConfirmCode('') }}><option value="">{t('portfolio.watchlist.allStatuses')}</option><option value="WATCHING">{t('portfolio.watchlist.status.WATCHING')}</option><option value="RESEARCHING">{t('portfolio.watchlist.status.RESEARCHING')}</option><option value="PAUSED">{t('portfolio.watchlist.status.PAUSED')}</option></select></label>
      <label>{t('portfolio.watchlist.sort')}<select value={sort} onChange={event => { setSort(event.target.value); setConfirmCode('') }}><option value="recent">{t('portfolio.watchlist.recent')}</option><option value="updated">{t('portfolio.watchlist.updated')}</option><option value="symbol">{t('portfolio.watchlist.symbolAZ')}</option><option value="company">{t('portfolio.watchlist.companyAZ')}</option></select></label>
      {hasViewFilters && <button type="button" className="ghost-btn small-btn watchlist-filter-reset" onClick={() => { setQuery(''); setIndustry(''); setStatus(''); setSort('recent'); setConfirmCode(''); searchRef.current?.focus() }}>{t('portfolio.watchlist.clearAllFilters')}</button>}
    </div>
    <ul className="watchlist">
      {visible.map(entry => {
        const stock = entry.Stock || {}
        const removing = confirmCode === stock.code
        const editing = editingCode === stock.code
        return <li key={entry.stock_id}>
          <div className="watchlist-company"><div><strong>{stock.code}</strong><span className={`watchlist-status status-${String(entry.status || 'WATCHING').toLowerCase()}`}>{t(`portfolio.watchlist.status.${entry.status || 'WATCHING'}`)}</span></div>{stock.name && <small>{stock.name}</small>}{entry.note && <p>{entry.note}</p>}{entry.metadata_updated_at && <time dateTime={entry.metadata_updated_at}>{t('portfolio.watchlist.updatedAt')} {formatDateTime(entry.metadata_updated_at, language, timezone)}</time>}</div>
          {editing ? <div className="watchlist-metadata-editor" role="group" aria-label={t('portfolio.watchlist.editAria', { code: stock.code })}><label>{t('portfolio.watchlist.statusLabel')}<select value={draft.status} disabled={mutation.type === 'updating'} onChange={event => setDraft(value => ({ ...value, status: event.target.value }))}><option value="WATCHING">{t('portfolio.watchlist.status.WATCHING')}</option><option value="RESEARCHING">{t('portfolio.watchlist.status.RESEARCHING')}</option><option value="PAUSED">{t('portfolio.watchlist.status.PAUSED')}</option></select></label><label>{t('portfolio.watchlist.noteLabel')}<textarea maxLength="280" rows="3" value={draft.note} disabled={mutation.type === 'updating'} onChange={event => setDraft(value => ({ ...value, note: event.target.value }))} placeholder={t('portfolio.watchlist.notePlaceholder')} /></label><span className="watchlist-note-count">{draft.note.length}/280</span><div><button type="button" className="ghost-btn small-btn" disabled={mutation.type === 'updating'} onClick={() => setEditingCode('')}>{t('portfolio.common.cancel')}</button><button type="button" className="primary-btn small-btn" disabled={mutation.type === 'updating'} onClick={() => saveMetadata(stock.code)}>{mutation.type === 'updating' ? t('portfolio.watchlist.saving') : t('portfolio.watchlist.save')}</button></div></div> : removing ? <div className="watchlist-confirm" role="group" aria-label={`${t('portfolio.watchlist.confirmAria')} ${stock.code}`} aria-busy={mutation.type === 'removing' && mutation.code === stock.code}><span>{t('portfolio.watchlist.removePrompt')}</span><button type="button" className="ghost-btn small-btn" disabled={busy} onClick={() => setConfirmCode('')}>{t('portfolio.common.cancel')}</button><button type="button" className="danger-btn small-btn" disabled={busy} onClick={() => remove(stock.code)}>{mutation.type === 'removing' && mutation.code === stock.code ? t('portfolio.common.deleting') : t('portfolio.watchlist.confirmRemove')}</button></div> : <div className="watchlist-actions"><button type="button" className="ghost-btn small-btn" disabled={busy} onClick={() => edit(entry)} aria-label={t('portfolio.watchlist.editAria', { code: stock.code })}>{t('portfolio.watchlist.edit')}</button><StockDetailLink className={`ghost-btn small-btn${busy || !stock.id ? ' is-disabled' : ''}`} stockId={stock.id} symbol={stock.code} onOpenDetail={busy ? undefined : onOpenDetail}>{t('portfolio.watchlist.openDetail')}</StockDetailLink><button type="button" className="ghost-btn small-btn" disabled={busy} onClick={() => { setConfirmCode(stock.code); setMutation({ type: '', code: '', message: '', error: false }) }} aria-label={t('portfolio.watchlist.removeAria', { code: stock.code })}>{t('portfolio.watchlist.remove')}</button></div>}
        </li>
      })}
      {!entries.length && <li className="muted-text watchlist-empty">{t('portfolio.watchlist.empty')}</li>}
    </ul>
    {entries.length > 0 && !visible.length && <p role="status" className="muted-text">{t('portfolio.watchlist.noMatch')}</p>}
  </article>
}
