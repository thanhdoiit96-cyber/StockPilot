import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDateTime, formatNumber } from '../services/userLocale.mjs'
import { translate } from '../services/i18n.mjs'
import { localizeApiError } from '../services/apiErrorCatalog.mjs'

const localDateTime = value => {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const emptyForm = () => ({ type: 'DEPOSIT', amount: '', occurred_at: localDateTime(), note: '' })

export default function PortfolioCashFlows({ entries = [], onCreate, onUpdate, onDelete, onRetry, loading = false, error = '', language = 'vi', timezone = 'Asia/Ho_Chi_Minh' }) {
  const t = key => translate(language, key)
  const money = value => `${formatNumber(value, language, { maximumFractionDigits: 0 })} ₫`
  const displayTime = value => formatDateTime(value, language, timezone)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState({ kind: '', text: '' })
  const [mutation, setMutation] = useState(null)
  const mutationLock = useRef(false)
  const dialogRef = useRef(null)
  const ordered = useMemo(() => [...entries].sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime() || String(b.id).localeCompare(String(a.id))), [entries])
  const totals = useMemo(() => entries.reduce((result, item) => {
    if (item.type === 'DEPOSIT') result.deposits += Number(item.amount || 0)
    if (item.type === 'WITHDRAWAL') result.withdrawals += Number(item.amount || 0)
    result.net = result.deposits - result.withdrawals
    return result
  }, { deposits: 0, withdrawals: 0, net: 0 }), [entries])
  const updateForm = event => setForm(value => ({ ...value, [event.target.name]: event.target.value }))
  const submit = async event => {
    event.preventDefault()
    if (saving || mutationLock.current) return
    mutationLock.current = true
    setSaving(true)
    setFeedback({ kind: '', text: '' })
    try {
      await onCreate({ ...form, occurred_at: new Date(form.occurred_at).toISOString() })
      setForm(emptyForm())
      setFeedback({ kind: 'success', text: t(form.type === 'DEPOSIT' ? 'portfolio.cash.recordedDeposit' : 'portfolio.cash.recordedWithdrawal') })
    } catch (error) {
      setFeedback({ kind: 'error', text: localizeApiError(error, language) })
    } finally {
      mutationLock.current = false
      setSaving(false)
    }
  }
  const openEdit = entry => setMutation({ kind: 'edit', entry, status: 'ready', error: '', form: { type: entry.type, amount: String(entry.amount), occurred_at: localDateTime(entry.occurred_at), note: entry.note || '' } })
  const saveEdit = async event => {
    event.preventDefault()
    if (mutationLock.current) return
    mutationLock.current = true
    setMutation(value => ({ ...value, status: 'saving', error: '' }))
    try {
      await onUpdate(mutation.entry.id, { ...mutation.form, occurred_at: new Date(mutation.form.occurred_at).toISOString() })
      setMutation(null)
      setFeedback({ kind: 'success', text: t('portfolio.cash.updated') })
    } catch (error) {
      setMutation(value => ({ ...value, status: 'ready', error: localizeApiError(error, language) }))
    } finally { mutationLock.current = false }
  }
  const remove = async () => {
    if (mutationLock.current) return
    mutationLock.current = true
    setMutation(value => ({ ...value, status: 'saving', error: '' }))
    try {
      await onDelete(mutation.entry.id)
      setMutation(null)
      setFeedback({ kind: 'success', text: t('portfolio.cash.deleted') })
    } catch (error) {
      setMutation(value => ({ ...value, status: 'ready', error: localizeApiError(error, language) }))
    } finally { mutationLock.current = false }
  }
  const mutationField = event => setMutation(value => ({ ...value, form: { ...value.form, [event.target.name]: event.target.value }, error: '' }))
  useEffect(() => {
    if (!mutation) return undefined
    dialogRef.current?.focus()
    const close = event => { if (event.key === 'Escape' && mutation.status !== 'saving') setMutation(null) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [mutation?.kind, mutation?.entry?.id, mutation?.status])

  return <article className={`panel cash-flow-panel${loading ? ' is-loading' : ''}${!loading && error ? ' has-error' : ''}`} aria-labelledby="cash-flow-title" lang={language} aria-busy={loading}>
    <div className="cash-flow-heading"><div><span className="eyebrow accent">{t('portfolio.cash.eyebrow')}</span><h3 id="cash-flow-title">{t('portfolio.cash.title')}</h3><p className="muted-text">{t('portfolio.cash.subtitle')}</p></div><span className="chip neutral">{entries.length} {t('portfolio.cash.records')}</span></div>
    {loading ? <div className="portfolio-resource-state loading" role="status"><span className="state-spinner" aria-hidden="true" />{t('portfolio.cash.loading')}</div> : null}
    {!loading && error ? <div className="portfolio-resource-state error" role="alert"><strong>{t('portfolio.cash.errorTitle')}</strong><span>{error}</span>{onRetry ? <button className="ghost-btn small-btn" type="button" onClick={onRetry}>{language === 'en' ? 'Retry' : 'Thử lại'}</button> : null}</div> : null}
    {!loading && !error ? <dl className="cash-flow-summary"><div><dt>{t('portfolio.cash.deposited')}</dt><dd className="positive">{money(totals.deposits)}</dd></div><div><dt>{t('portfolio.cash.withdrawn')}</dt><dd>{money(totals.withdrawals)}</dd></div><div><dt>{t('portfolio.cash.net')}</dt><dd className={totals.net > 0 ? 'positive' : totals.net < 0 ? 'negative' : ''}>{money(totals.net)}</dd></div></dl> : null}
    {!loading && !error ? <form className="cash-flow-form" onSubmit={submit}>
      <label>{t('portfolio.cash.type')}<select name="type" value={form.type} disabled={saving} onChange={updateForm}><option value="DEPOSIT">{t('portfolio.cash.deposit')}</option><option value="WITHDRAWAL">{t('portfolio.cash.withdrawal')}</option></select></label>
      <label>{t('portfolio.cash.amount')}<input name="amount" type="number" min="1" max="1000000000000000" step="1" required value={form.amount} disabled={saving} onChange={updateForm} placeholder={t('portfolio.cash.amountPlaceholder')} /></label>
      <label>{t('portfolio.common.time')}<input name="occurred_at" type="datetime-local" required value={form.occurred_at} disabled={saving} onChange={updateForm} /></label>
      <label className="cash-flow-note">{t('portfolio.common.note')} <span>{t('portfolio.cash.optional')}</span><input name="note" maxLength="240" value={form.note} disabled={saving} onChange={updateForm} placeholder={t('portfolio.cash.notePlaceholder')} /></label>
      <button className="primary-btn" type="submit" disabled={saving || !onCreate}>{t(saving ? 'portfolio.common.saving' : 'portfolio.cash.record')}</button>
    </form> : null}
    {feedback.text ? <p className={`cash-flow-feedback ${feedback.kind === 'error' ? 'error-text' : 'positive'}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>{feedback.text}</p> : null}
    {ordered.length ? <><p id="portfolio-cash-scroll-hint" className="table-scroll-hint" role="note">{t('portfolio.cash.scrollHint')}</p><div className="table-wrap cash-flow-table"><table aria-label={t('portfolio.cash.history')} aria-describedby="portfolio-cash-scroll-hint"><thead><tr><th>{t('portfolio.common.time')}</th><th>{t('portfolio.cash.type')}</th><th>{t('portfolio.cash.amount')}</th><th>{t('portfolio.common.note')}</th><th>{t('portfolio.common.actions')}</th></tr></thead><tbody>{ordered.map(entry => <tr key={entry.id}><td>{displayTime(entry.occurred_at)}</td><td><span className={`ledger-side ${entry.type === 'DEPOSIT' ? 'buy' : 'sell'}`}>{t(entry.type === 'DEPOSIT' ? 'portfolio.cash.deposit' : 'portfolio.cash.withdrawal')}</span></td><td className={entry.type === 'DEPOSIT' ? 'positive' : ''}>{entry.type === 'DEPOSIT' ? '+' : '−'}{money(entry.amount)}</td><td className="cash-flow-row-note">{entry.note || '—'}</td><td><div className="ledger-row-actions"><button className="ghost-btn small-btn" type="button" onClick={() => openEdit(entry)}>{t('portfolio.common.edit')}</button><button className="ghost-btn small-btn danger" type="button" onClick={() => setMutation({ kind: 'delete', entry, status: 'ready', error: '' })}>{t('portfolio.common.delete')}</button></div></td></tr>)}</tbody></table></div></> : <div className="cash-flow-empty"><strong>{t('portfolio.cash.empty')}</strong><p>{t('portfolio.cash.emptyText')}</p></div>}
    {mutation ? <div className="ledger-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && mutation.status !== 'saving') setMutation(null) }}><section className="ledger-dialog cash-flow-dialog" role="dialog" aria-modal="true" aria-labelledby="cash-flow-dialog-title" tabIndex="-1" ref={dialogRef}>
      {mutation.kind === 'edit' ? <form onSubmit={saveEdit}><div className="ledger-dialog-header"><div><span className="eyebrow accent">{t('portfolio.cash.eyebrow')}</span><h3 id="cash-flow-dialog-title">{t('portfolio.cash.editTitle')}</h3><p>{t('portfolio.cash.editHelp')}</p></div></div><div className="ledger-edit-grid"><label>{t('portfolio.cash.type')}<select name="type" value={mutation.form.type} disabled={mutation.status === 'saving'} onChange={mutationField}><option value="DEPOSIT">{t('portfolio.cash.deposit')}</option><option value="WITHDRAWAL">{t('portfolio.cash.withdrawal')}</option></select></label><label>{t('portfolio.cash.amount')}<input name="amount" type="number" min="1" step="1" required value={mutation.form.amount} disabled={mutation.status === 'saving'} onChange={mutationField} /></label><label className="ledger-edit-time">{t('portfolio.common.time')}<input name="occurred_at" type="datetime-local" required value={mutation.form.occurred_at} disabled={mutation.status === 'saving'} onChange={mutationField} /></label><label className="ledger-edit-time">{t('portfolio.common.note')}<input name="note" maxLength="240" value={mutation.form.note} disabled={mutation.status === 'saving'} onChange={mutationField} /></label></div>{mutation.error ? <p className="error-text ledger-dialog-note" role="alert">{mutation.error}</p> : null}<div className="ledger-dialog-actions"><button className="ghost-btn" type="button" disabled={mutation.status === 'saving'} onClick={() => setMutation(null)}>{t('portfolio.common.cancel')}</button><button className="primary-btn" type="submit" disabled={mutation.status === 'saving'}>{t(mutation.status === 'saving' ? 'portfolio.common.saving' : 'portfolio.cash.saveChanges')}</button></div></form> : <><div className="ledger-dialog-header"><div><span className="eyebrow accent">{t('portfolio.cash.confirm')}</span><h3 id="cash-flow-dialog-title">{t('portfolio.cash.deleteTitle')}</h3><p>{t(mutation.entry.type === 'DEPOSIT' ? 'portfolio.cash.deposit' : 'portfolio.cash.withdrawal')} · {money(mutation.entry.amount)}</p></div></div><p className="ledger-dialog-note">{t('portfolio.cash.deleteHelp')}</p>{mutation.error ? <p className="error-text ledger-dialog-note" role="alert">{mutation.error}</p> : null}<div className="ledger-dialog-actions"><button className="ghost-btn" type="button" disabled={mutation.status === 'saving'} onClick={() => setMutation(null)}>{t('portfolio.common.cancel')}</button><button className="danger-btn" type="button" disabled={mutation.status === 'saving'} onClick={remove}>{t(mutation.status === 'saving' ? 'portfolio.common.deleting' : 'portfolio.cash.confirmDelete')}</button></div></>}
    </section></div> : null}
  </article>
}
