import { useEffect, useMemo, useRef, useState } from 'react'

const money = value => `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(value || 0))} ₫`
const localDateTime = value => {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const displayTime = value => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value))
const emptyForm = () => ({ type: 'DEPOSIT', amount: '', occurred_at: localDateTime(), note: '' })

export default function PortfolioCashFlows({ entries = [], onCreate, onUpdate, onDelete }) {
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
      setFeedback({ kind: 'success', text: `Đã ghi nhận ${form.type === 'DEPOSIT' ? 'nạp tiền' : 'rút tiền'}.` })
    } catch (error) {
      setFeedback({ kind: 'error', text: error.message })
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
      setFeedback({ kind: 'success', text: 'Đã cập nhật dòng tiền.' })
    } catch (error) {
      setMutation(value => ({ ...value, status: 'ready', error: error.message }))
    } finally { mutationLock.current = false }
  }
  const remove = async () => {
    if (mutationLock.current) return
    mutationLock.current = true
    setMutation(value => ({ ...value, status: 'saving', error: '' }))
    try {
      await onDelete(mutation.entry.id)
      setMutation(null)
      setFeedback({ kind: 'success', text: 'Đã xóa dòng tiền.' })
    } catch (error) {
      setMutation(value => ({ ...value, status: 'ready', error: error.message }))
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

  return <article className="panel cash-flow-panel" aria-labelledby="cash-flow-title">
    <div className="cash-flow-heading"><div><span className="eyebrow accent">DÒNG TIỀN</span><h3 id="cash-flow-title">Nạp và rút tiền</h3><p className="muted-text">Tách dòng tiền bên ngoài khỏi lãi/lỗ đầu tư để chuẩn bị tính hiệu suất theo thời gian.</p></div><span className="chip neutral">{entries.length} bản ghi</span></div>
    <dl className="cash-flow-summary"><div><dt>Đã nạp</dt><dd className="positive">{money(totals.deposits)}</dd></div><div><dt>Đã rút</dt><dd>{money(totals.withdrawals)}</dd></div><div><dt>Dòng tiền ròng</dt><dd className={totals.net > 0 ? 'positive' : totals.net < 0 ? 'negative' : ''}>{money(totals.net)}</dd></div></dl>
    <form className="cash-flow-form" onSubmit={submit}>
      <label>Loại dòng tiền<select name="type" value={form.type} disabled={saving} onChange={updateForm}><option value="DEPOSIT">Nạp tiền</option><option value="WITHDRAWAL">Rút tiền</option></select></label>
      <label>Số tiền (VND)<input name="amount" type="number" min="1" max="1000000000000000" step="1" required value={form.amount} disabled={saving} onChange={updateForm} placeholder="Ví dụ: 10000000" /></label>
      <label>Thời điểm<input name="occurred_at" type="datetime-local" required value={form.occurred_at} disabled={saving} onChange={updateForm} /></label>
      <label className="cash-flow-note">Ghi chú <span>(không bắt buộc)</span><input name="note" maxLength="240" value={form.note} disabled={saving} onChange={updateForm} placeholder="Ví dụ: Vốn đầu tư tháng 10" /></label>
      <button className="primary-btn" type="submit" disabled={saving || !onCreate}>{saving ? 'Đang lưu…' : 'Ghi nhận'}</button>
    </form>
    {feedback.text ? <p className={`cash-flow-feedback ${feedback.kind === 'error' ? 'error-text' : 'positive'}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>{feedback.text}</p> : null}
    {ordered.length ? <div className="table-wrap cash-flow-table"><table aria-label="Lịch sử nạp và rút tiền"><thead><tr><th>Thời điểm</th><th>Loại</th><th>Số tiền</th><th>Ghi chú</th><th>Thao tác</th></tr></thead><tbody>{ordered.map(entry => <tr key={entry.id}><td>{displayTime(entry.occurred_at)}</td><td><span className={`ledger-side ${entry.type === 'DEPOSIT' ? 'buy' : 'sell'}`}>{entry.type === 'DEPOSIT' ? 'Nạp tiền' : 'Rút tiền'}</span></td><td className={entry.type === 'DEPOSIT' ? 'positive' : ''}>{entry.type === 'DEPOSIT' ? '+' : '−'}{money(entry.amount)}</td><td className="cash-flow-row-note">{entry.note || '—'}</td><td><div className="ledger-row-actions"><button className="ghost-btn small-btn" type="button" onClick={() => openEdit(entry)}>Sửa</button><button className="ghost-btn small-btn danger" type="button" onClick={() => setMutation({ kind: 'delete', entry, status: 'ready', error: '' })}>Xóa</button></div></td></tr>)}</tbody></table></div> : <div className="cash-flow-empty"><strong>Chưa có dòng tiền</strong><p>Thêm lần nạp vốn đầu tiên để chuẩn bị dữ liệu tính hiệu suất theo kỳ.</p></div>}
    {mutation ? <div className="ledger-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && mutation.status !== 'saving') setMutation(null) }}><section className="ledger-dialog cash-flow-dialog" role="dialog" aria-modal="true" aria-labelledby="cash-flow-dialog-title" tabIndex="-1" ref={dialogRef}>
      {mutation.kind === 'edit' ? <form onSubmit={saveEdit}><div className="ledger-dialog-header"><div><span className="eyebrow accent">DÒNG TIỀN</span><h3 id="cash-flow-dialog-title">Sửa bản ghi</h3><p>Thay đổi sẽ cập nhật dữ liệu hiệu suất liên quan.</p></div></div><div className="ledger-edit-grid"><label>Loại<select name="type" value={mutation.form.type} disabled={mutation.status === 'saving'} onChange={mutationField}><option value="DEPOSIT">Nạp tiền</option><option value="WITHDRAWAL">Rút tiền</option></select></label><label>Số tiền (VND)<input name="amount" type="number" min="1" step="1" required value={mutation.form.amount} disabled={mutation.status === 'saving'} onChange={mutationField} /></label><label className="ledger-edit-time">Thời điểm<input name="occurred_at" type="datetime-local" required value={mutation.form.occurred_at} disabled={mutation.status === 'saving'} onChange={mutationField} /></label><label className="ledger-edit-time">Ghi chú<input name="note" maxLength="240" value={mutation.form.note} disabled={mutation.status === 'saving'} onChange={mutationField} /></label></div>{mutation.error ? <p className="error-text ledger-dialog-note" role="alert">{mutation.error}</p> : null}<div className="ledger-dialog-actions"><button className="ghost-btn" type="button" disabled={mutation.status === 'saving'} onClick={() => setMutation(null)}>Hủy</button><button className="primary-btn" type="submit" disabled={mutation.status === 'saving'}>{mutation.status === 'saving' ? 'Đang lưu…' : 'Lưu thay đổi'}</button></div></form> : <><div className="ledger-dialog-header"><div><span className="eyebrow accent">XÁC NHẬN</span><h3 id="cash-flow-dialog-title">Xóa dòng tiền?</h3><p>{mutation.entry.type === 'DEPOSIT' ? 'Nạp tiền' : 'Rút tiền'} · {money(mutation.entry.amount)}</p></div></div><p className="ledger-dialog-note">Dữ liệu hiệu suất tương lai sẽ được tính lại sau khi xóa.</p>{mutation.error ? <p className="error-text ledger-dialog-note" role="alert">{mutation.error}</p> : null}<div className="ledger-dialog-actions"><button className="ghost-btn" type="button" disabled={mutation.status === 'saving'} onClick={() => setMutation(null)}>Hủy</button><button className="danger-btn" type="button" disabled={mutation.status === 'saving'} onClick={remove}>{mutation.status === 'saving' ? 'Đang xóa…' : 'Xác nhận xóa'}</button></div></>}
    </section></div> : null}
  </article>
}
