import { useEffect, useMemo, useRef, useState } from 'react'
import { parsePortfolioLedgerCsv, serializePortfolioLedger } from '../services/portfolioLedgerCsv.mjs'
import { formatDateTime, formatNumber } from '../services/userLocale.mjs'
import { translate } from '../services/i18n.mjs'
import { localizeApiError } from '../services/apiErrorCatalog.mjs'


function exportCsv(entries, fileName = `stockpilot-ledger-${new Date().toISOString().slice(0, 10)}.csv`) {
  const csv = serializePortfolioLedger(entries)
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const editDateTime = value => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default function PortfolioLedger({ entries = [], onImport, onUpdate, onDelete, loading = false, error = '', language = 'vi', timezone = 'Asia/Ho_Chi_Minh' }) {
  const t = (key, values) => translate(language, key, values)
  const number = value => formatNumber(value, language, { maximumFractionDigits: 4 })
  const money = value => `${formatNumber(value, language, { maximumFractionDigits: 0 })} ₫`
  const dateTime = value => formatDateTime(value, language, timezone)
  const [expanded, setExpanded] = useState(false)
  const [importState, setImportState] = useState({ status: 'idle', rows: [], result: null, fileName: '', error: '' })
  const [mutation, setMutation] = useState(null)
  const [feedback, setFeedback] = useState('')
  const dialogRef = useRef(null)
  const ordered = useMemo(() => [...entries].sort((left, right) => {
    const time = new Date(right.traded_at || 0).getTime() - new Date(left.traded_at || 0).getTime()
    return time || String(right.id || '').localeCompare(String(left.id || ''))
  }), [entries])
  const visible = expanded ? ordered : ordered.slice(0, 10)
  const previewFile = async event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      setFeedback('')
      setImportState({ status: 'loading', rows: [], result: null, fileName: file.name, error: '' })
      const rows = parsePortfolioLedgerCsv(await file.text())
      const result = await onImport(rows, true)
      setImportState({ status: 'preview', rows, result, fileName: file.name, error: '' })
    } catch (error) {
      setImportState({ status: 'error', rows: [], result: null, fileName: file.name, error: localizeApiError(error, language) })
    }
  }
  const commitImport = async () => {
    try {
      setImportState(state => ({ ...state, status: 'committing', error: '' }))
      const result = await onImport(importState.rows, false)
      setImportState({ status: 'success', rows: [], result, fileName: importState.fileName, error: '' })
    } catch (error) {
      setImportState(state => ({ ...state, status: 'error', error: localizeApiError(error, language) }))
    }
  }
  useEffect(() => {
    if (!mutation) return undefined
    dialogRef.current?.focus()
    const closeOnEscape = event => {
      if (event.key === 'Escape' && mutation.status !== 'saving') setMutation(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [mutation?.kind, mutation?.entry?.id, mutation?.status])

  const openEdit = entry => {
    setFeedback('')
    setMutation({
      kind: 'edit',
      entry,
      status: 'confirm',
      error: '',
      form: {
        side: entry.side,
        quantity: String(entry.quantity),
        price: String(entry.price),
        fees: String(entry.fees || 0),
        traded_at: editDateTime(entry.traded_at)
      }
    })
  }
  const updateField = event => {
    const { name, value } = event.target
    setMutation(state => ({ ...state, form: { ...state.form, [name]: value }, error: '' }))
  }
  const confirmEdit = async event => {
    event.preventDefault()
    try {
      setMutation(state => ({ ...state, status: 'saving', error: '' }))
      await onUpdate(mutation.entry.id, {
        ...mutation.form,
        traded_at: new Date(mutation.form.traded_at).toISOString()
      })
      setFeedback(t('portfolio.ledger.updated'))
      setMutation(null)
    } catch (error) {
      setMutation(state => ({ ...state, status: 'confirm', error: localizeApiError(error, language) }))
    }
  }
  const confirmDelete = async () => {
    try {
      setMutation(state => ({ ...state, status: 'saving', error: '' }))
      await onDelete(mutation.entry.id)
      setFeedback(t('portfolio.ledger.deleted'))
      setMutation(null)
    } catch (error) {
      setMutation(state => ({ ...state, status: 'confirm', error: localizeApiError(error, language) }))
    }
  }

  return <article className="panel portfolio-ledger-panel" lang={language} aria-busy={loading}>
    <div className="portfolio-ledger-heading">
      <div>
        <h3>{t('portfolio.ledger.title')}</h3>
        <p className="muted-text">{t('portfolio.ledger.subtitle')}</p>
      </div>
      <div className="portfolio-ledger-actions">
        <span className="chip neutral">{ordered.length} {t('portfolio.ledger.transactions')}</span>
        <button className="ghost-btn" type="button" onClick={() => exportCsv([], 'stockpilot-ledger-template.csv')}>{t('portfolio.ledger.template')}</button>
        <label className={`ghost-btn portfolio-import-button${importState.status === 'loading' || importState.status === 'committing' || loading || error ? ' disabled' : ''}`}>
          {t('portfolio.ledger.import')}
          <input type="file" accept=".csv,text/csv" disabled={!onImport || loading || error || importState.status === 'loading' || importState.status === 'committing'} onChange={previewFile} />
        </label>
        <button className="ghost-btn" type="button" disabled={!ordered.length} onClick={() => exportCsv(ordered)}>{t('portfolio.ledger.export')}</button>
      </div>
    </div>
    {loading ? <div className="portfolio-resource-state loading" role="status"><span className="state-spinner" aria-hidden="true" />{t('portfolio.ledger.loading')}</div> : null}
    {!loading && error ? <div className="portfolio-resource-state error" role="alert"><strong>{t('portfolio.ledger.errorTitle')}</strong><span>{error}</span></div> : null}
    {feedback ? <p className="portfolio-ledger-feedback positive" role="status">{feedback}</p> : null}
    {importState.status !== 'idle' ? <div className="portfolio-import-status" role="status" aria-live="polite">
      {(importState.status === 'loading' || importState.status === 'committing') && <p>{t(importState.status === 'loading' ? 'portfolio.ledger.checking' : 'portfolio.ledger.importing')}</p>}
      {importState.status === 'error' && <p className="error-text">{importState.error}</p>}
      {importState.status === 'success' && <p className="positive">{t('portfolio.ledger.imported', { count: importState.result?.row_count || 0, file: importState.fileName })}</p>}
      {importState.status === 'preview' && <>
        <p><strong>{importState.fileName}</strong> · {importState.rows.length} {t('portfolio.ledger.rows')} · {t(importState.result?.valid ? 'portfolio.ledger.ready' : 'portfolio.ledger.notReady')}</p>
        {(importState.result?.errors || []).length ? <><ul>{importState.result.errors.slice(0, 10).map((error, index) => <li key={`${error.row}-${error.field}-${index}`}>{t('portfolio.ledger.row')} {error.row || '-'} · {error.message}</li>)}</ul>{importState.result.errors.length > 10 ? <small>{t('portfolio.ledger.moreErrors', { count: importState.result.errors.length - 10 })}</small> : null}</> : null}
        <div className="portfolio-import-actions">
          <button className="ghost-btn" type="button" onClick={() => setImportState({ status: 'idle', rows: [], result: null, fileName: '', error: '' })}>{t('portfolio.common.cancel')}</button>
          <button className="primary-btn" type="button" disabled={!importState.result?.valid} onClick={commitImport}>{t('portfolio.ledger.importCount', { count: importState.rows.length })}</button>
        </div>
      </>}
    </div> : null}
    {!loading && !error && ordered.length ? <>
      <div className="table-wrap portfolio-ledger-table">
        <table aria-label={t('portfolio.ledger.table')}>
          <thead><tr><th>{t('portfolio.common.time')}</th><th>{t('portfolio.positions.symbol')}</th><th>{t('portfolio.transaction.side')}</th><th>{t('portfolio.transaction.quantity')}</th><th>{t('portfolio.ledger.price')}</th><th>{t('portfolio.ledger.fees')}</th><th>{t('portfolio.ledger.source')}</th><th>{t('portfolio.common.actions')}</th></tr></thead>
          <tbody>{visible.map(entry => <tr key={entry.id || `${entry.symbol}-${entry.traded_at}`}>
            <td>{dateTime(entry.traded_at)}</td>
            <td><strong className="symbol">{entry.symbol || '-'}</strong>{entry.name ? <small>{entry.name}</small> : null}</td>
            <td><span className={`ledger-side ${entry.side === 'BUY' ? 'buy' : 'sell'}`}>{t(entry.side === 'BUY' ? 'portfolio.transaction.buy' : 'portfolio.transaction.sell')}</span></td>
            <td>{number(entry.quantity)}</td>
            <td>{money(entry.price)}</td>
            <td>{money(entry.fees)}</td>
            <td>{t(entry.source === 'recommendation' ? 'portfolio.ledger.recommendation' : 'portfolio.ledger.manual')}</td>
            <td><div className="ledger-row-actions">
              <button className="ghost-btn small-btn" type="button" disabled={!onUpdate} onClick={() => openEdit(entry)}>{t('portfolio.common.edit')}</button>
              <button className="ghost-btn small-btn danger" type="button" disabled={!onDelete} onClick={() => {
                setFeedback('')
                setMutation({ kind: 'delete', entry, status: 'confirm', error: '' })
              }}>{t('portfolio.common.delete')}</button>
            </div></td>
          </tr>)}</tbody>
        </table>
      </div>
      {ordered.length > 10 ? <button className="ghost-btn portfolio-ledger-toggle" type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? t('portfolio.ledger.collapse') : t('portfolio.ledger.showAll', { count: ordered.length })}</button> : null}
    </> : null}
    {!loading && !error && !ordered.length ? <p className="muted-text portfolio-ledger-empty">{t('portfolio.ledger.empty')}</p> : null}
    {mutation ? <div className="ledger-dialog-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget && mutation.status !== 'saving') setMutation(null)
    }}>
      <section className="ledger-dialog" role="dialog" aria-modal="true" aria-labelledby="ledger-dialog-title" tabIndex={-1} ref={dialogRef}>
        {mutation.kind === 'edit' ? <form onSubmit={confirmEdit}>
          <div className="ledger-dialog-header">
            <div><span className="eyebrow accent">{t('portfolio.ledger.eyebrow')}</span><h3 id="ledger-dialog-title">{t('portfolio.ledger.editTitle', { symbol: mutation.entry.symbol })}</h3><p>{t('portfolio.ledger.editText')}</p></div>
            <span className="chip neutral ledger-dialog-symbol">{mutation.entry.symbol}</span>
          </div>
          <p className="ledger-dialog-note">{t('portfolio.ledger.timelineCheck')}</p>
          <div className="ledger-edit-grid">
            <label>{t('portfolio.transaction.side')}<select name="side" value={mutation.form.side} disabled={mutation.status === 'saving' || mutation.entry.source === 'recommendation'} onChange={updateField}><option value="BUY">{t('portfolio.transaction.buy')}</option><option value="SELL">{t('portfolio.transaction.sell')}</option></select></label>
            <label>{t('portfolio.transaction.quantity')}<input name="quantity" type="number" min="0.000001" step="any" required disabled={mutation.status === 'saving'} value={mutation.form.quantity} onChange={updateField} /></label>
            <label>{t('portfolio.ledger.pricePerShare')}<input name="price" type="number" min="1" step="any" required disabled={mutation.status === 'saving'} value={mutation.form.price} onChange={updateField} /></label>
            <label>{t('portfolio.ledger.feesVnd')}<input name="fees" type="number" min="0" step="any" required disabled={mutation.status === 'saving'} value={mutation.form.fees} onChange={updateField} /></label>
            <label className="ledger-edit-time">{t('portfolio.ledger.tradeTime')}<input name="traded_at" type="datetime-local" required disabled={mutation.status === 'saving'} value={mutation.form.traded_at} onChange={updateField} /></label>
          </div>
          {mutation.entry.source === 'recommendation' ? <small className="ledger-dialog-help">{t('portfolio.ledger.recommendationLock')}</small> : null}
          {mutation.error ? <p className="error-text" role="alert">{mutation.error}</p> : null}
          <div className="ledger-dialog-actions"><button className="ghost-btn" type="button" disabled={mutation.status === 'saving'} onClick={() => setMutation(null)}>{t('portfolio.common.cancel')}</button><button className="primary-btn" type="submit" disabled={mutation.status === 'saving'}>{t(mutation.status === 'saving' ? 'portfolio.ledger.checkingSave' : 'portfolio.ledger.confirmEdit')}</button></div>
        </form> : <>
          <h3 id="ledger-dialog-title">{t('portfolio.ledger.deleteTitle')}</h3>
          <p>{t('portfolio.ledger.deleteIntro')} <strong>{t(mutation.entry.side === 'BUY' ? 'portfolio.transaction.buy' : 'portfolio.transaction.sell')} {number(mutation.entry.quantity)} {mutation.entry.symbol}</strong> · {dateTime(mutation.entry.traded_at)}.</p>
          <p className="muted-text">{t('portfolio.ledger.deleteSafety')}</p>
          {mutation.error ? <p className="error-text" role="alert">{mutation.error}</p> : null}
          <div className="ledger-dialog-actions"><button className="ghost-btn" type="button" disabled={mutation.status === 'saving'} onClick={() => setMutation(null)}>{t('portfolio.common.cancel')}</button><button className="danger-btn" type="button" disabled={mutation.status === 'saving'} onClick={confirmDelete}>{t(mutation.status === 'saving' ? 'portfolio.ledger.checkingSave' : 'portfolio.ledger.confirmDelete')}</button></div>
        </>}
      </section>
    </div> : null}
  </article>
}
