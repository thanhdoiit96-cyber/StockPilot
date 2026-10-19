import { useEffect, useMemo, useRef, useState } from 'react'

const types = ['RESEARCH', 'BUY', 'HOLD', 'SELL']
const labels = {
  RESEARCH: ['Nghiên cứu', 'Research'], BUY: ['Mua', 'Buy'], HOLD: ['Nắm giữ', 'Hold'], SELL: ['Bán', 'Sell']
}
const dateValue = date => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)

export default function PortfolioDecisionJournal({ decisions = [], evidence = [], saving = false, onCreate, onClose, onDelete, active = false, language = 'vi' }) {
  const en = language === 'en'
  const copy = (vi, english) => en ? english : vi
  const [form, setForm] = useState(() => ({ symbol: '', decision_type: 'RESEARCH', thesis: '', review_date: dateValue(new Date(Date.now() + 7 * 86400000)), invalidation_condition: '', evidence_transaction_id: '' }))
  const [error, setError] = useState('')
  const [mutation, setMutation] = useState(null)
  const [feedback, setFeedback] = useState('')
  const dialogRef = useRef(null)
  const relevantEvidence = useMemo(() => evidence.filter(item => !form.symbol || item.symbol === form.symbol.trim().toUpperCase()), [evidence, form.symbol])
  const change = (key, value) => setForm(current => ({ ...current, [key]: value }))
  useEffect(() => {
    if (!mutation) return undefined
    dialogRef.current?.focus()
    const closeOnEscape = event => {
      if (event.key === 'Escape' && !saving) setMutation(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [mutation?.kind, mutation?.decision?.id, saving])
  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      await onCreate?.(form)
      setForm(current => ({ ...current, thesis: '', invalidation_condition: '', evidence_transaction_id: '' }))
      setFeedback(copy('Đã lưu entry nhật ký quyết định.', 'Decision journal entry saved.'))
    } catch (requestError) { setError(requestError.message || copy('Không thể lưu entry.', 'Could not save entry.')) }
  }
  async function confirmMutation() {
    if (!mutation) return
    setError('')
    try {
      if (mutation.kind === 'close') {
        await onClose?.(mutation.decision.id)
        setFeedback(copy('Đã đóng entry. Kết quả thị trường không được suy diễn.', 'Entry closed. No market outcome was inferred.'))
      } else {
        await onDelete?.(mutation.decision.id)
        setFeedback(copy('Đã xóa entry.', 'Entry deleted.'))
      }
      setMutation(null)
    } catch (requestError) { setError(requestError.message || copy('Không thể hoàn tất thao tác.', 'Could not complete the action.')) }
  }
  return <div className="personal-grid portfolio-tab-panel" role="tabpanel" id="portfolio-panel-decisions" aria-labelledby="portfolio-tab-decisions" hidden={!active} tabIndex={0}>
    <section className="panel decision-journal-form-panel"><div className="portfolio-section-heading"><div><span className="eyebrow accent">{copy('NHẬT KÝ QUYẾT ĐỊNH', 'DECISION JOURNAL')}</span><h3>{copy('Ghi lại luận điểm trước khi nhìn vào kết quả', 'Capture the thesis before reviewing outcomes')}</h3><p className="muted-text">{copy('Đây là ghi chú do bạn nhập. Entry không tính lãi/lỗ và không tạo lệnh.', 'These are your notes. Entries do not calculate P/L or place orders.')}</p></div></div>
      <form className="decision-journal-form" onSubmit={submit}>
        <label>{copy('Mã cổ phiếu', 'Stock symbol')}<input value={form.symbol} required maxLength="10" onChange={event => { const symbol = event.target.value.toUpperCase(); change('symbol', symbol); if (form.evidence_transaction_id && !evidence.some(item => item.transaction_id === form.evidence_transaction_id && item.symbol === symbol)) change('evidence_transaction_id', '') }} /></label>
        <label>{copy('Loại quyết định', 'Decision type')}<select value={form.decision_type} onChange={event => change('decision_type', event.target.value)}>{types.map(type => <option value={type} key={type}>{labels[type][en ? 1 : 0]}</option>)}</select></label>
        <label>{copy('Ngày rà soát', 'Review date')}<input type="date" min={dateValue(new Date())} value={form.review_date} required onChange={event => change('review_date', event.target.value)} /></label>
        <label className="decision-wide">{copy('Luận điểm', 'Thesis')}<textarea value={form.thesis} required minLength="10" maxLength="2000" onChange={event => change('thesis', event.target.value)} placeholder={copy('Điều gì khiến quyết định này hợp lý ở thời điểm hiện tại?', 'Why does this decision make sense at this time?')} /></label>
        <label className="decision-wide">{copy('Điều kiện vô hiệu', 'Invalidation condition')}<textarea value={form.invalidation_condition} required minLength="5" maxLength="1000" onChange={event => change('invalidation_condition', event.target.value)} placeholder={copy('Điều gì sẽ khiến bạn xem lại luận điểm?', 'What would make you revisit this thesis?')} /></label>
        <label className="decision-wide">{copy('Evidence snapshot từ đề xuất', 'Recommendation evidence snapshot')}<select value={form.evidence_transaction_id} onChange={event => change('evidence_transaction_id', event.target.value)}><option value="">{copy('Chưa gắn snapshot', 'No snapshot attached')}</option>{relevantEvidence.map(item => <option key={item.transaction_id} value={item.transaction_id}>{item.symbol} · {item.evidence_snapshot?.score ?? '—'}/100 · {String(item.traded_at || '').slice(0, 10)}</option>)}</select><small>{copy('Chỉ hiển thị giao dịch mua đã có context đề xuất cùng mã. Server sẽ lưu bản snapshot bất biến.', 'Only buy transactions with a matching recommendation context are shown. The server stores an immutable snapshot.')}</small></label>
        <button className="primary-btn" type="submit" disabled={saving}>{saving ? copy('Đang lưu…', 'Saving…') : copy('Lưu entry', 'Save entry')}</button>
      </form>{error && !mutation && <p className="error-text" role="alert">{error}</p>}{feedback && <p className="decision-journal-feedback" role="status">{feedback}</p>}
    </section>
    <section className="panel decision-journal-list"><div className="portfolio-section-heading"><div><h3>{copy('Entry đã lưu', 'Saved entries')}</h3><p className="muted-text">{copy('Đóng entry chỉ ghi nhận trạng thái của bạn, không đánh giá đúng/sai.', 'Closing an entry records only your status; it does not judge the outcome.')}</p></div><span className="chip neutral">{decisions.length}</span></div>
      {decisions.length ? <ol className="decision-list">{decisions.map(decision => <li key={decision.id}><header><div><strong>{decision.symbol}</strong><span className="chip neutral">{labels[decision.decision_type]?.[en ? 1 : 0] || decision.decision_type}</span><span className={`chip ${decision.status === 'CLOSED' ? 'neutral' : 'success'}`}>{decision.status === 'CLOSED' ? copy('Đã đóng', 'Closed') : copy('Đang mở', 'Active')}</span></div><small>{copy('Rà soát', 'Review')} {decision.review_date}</small></header><p>{decision.thesis}</p><div className="decision-invalidation"><strong>{copy('Vô hiệu khi:', 'Invalid when:')}</strong> {decision.invalidation_condition}</div>{decision.evidence_snapshot ? <div className="decision-evidence"><strong>{copy('Evidence snapshot', 'Evidence snapshot')}</strong><span>{decision.evidence_snapshot.model || copy('Mô hình không rõ', 'Unknown model')} · {decision.evidence_snapshot.score ?? '—'}/100 · {decision.evidence_snapshot.horizon_days ?? '—'} {copy('phiên', 'sessions')}</span></div> : <p className="muted-text">{copy('Chưa gắn evidence snapshot.', 'No evidence snapshot attached.')}</p>}<footer>{decision.status !== 'CLOSED' && <button type="button" className="ghost-btn small-btn" disabled={saving} onClick={() => { setError(''); setMutation({ kind: 'close', decision }) }}>{copy('Đóng entry', 'Close entry')}</button>}<button type="button" className="ghost-btn small-btn danger-btn" disabled={saving} onClick={() => { setError(''); setMutation({ kind: 'delete', decision }) }}>{copy('Xóa', 'Delete')}</button></footer></li>)}</ol> : <p className="muted-text">{copy('Chưa có entry. Hãy ghi lại luận điểm và mốc rà soát đầu tiên.', 'No entries yet. Record your first thesis and review date.')}</p>}
    </section>
    {mutation && <div className="decision-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setMutation(null) }}><section className="decision-dialog" role="dialog" aria-modal="true" aria-labelledby="decision-dialog-title" tabIndex={-1} ref={dialogRef}><h3 id="decision-dialog-title">{mutation.kind === 'close' ? copy('Đóng entry nhật ký?', 'Close decision entry?') : copy('Xóa entry nhật ký?', 'Delete decision entry?')}</h3><p>{mutation.kind === 'close' ? copy(`Bạn sẽ ghi entry ${mutation.decision.symbol} là đã đóng. Hành động này không đánh giá đúng/sai hay tạo kết quả thị trường.`, `You will mark ${mutation.decision.symbol} as closed. This does not judge the decision or create a market outcome.`) : copy(`Bạn sẽ xóa entry ${mutation.decision.symbol}. Hành động này không thể hoàn tác.`, `You will delete the ${mutation.decision.symbol} entry. This action cannot be undone.`)}</p>{error && <p className="error-text" role="alert">{error}</p>}<div className="decision-dialog-actions"><button type="button" className="ghost-btn" disabled={saving} onClick={() => setMutation(null)}>{copy('Hủy', 'Cancel')}</button><button type="button" className={mutation.kind === 'delete' ? 'danger-btn' : 'primary-btn'} disabled={saving} onClick={confirmMutation}>{saving ? copy('Đang lưu…', 'Saving…') : mutation.kind === 'close' ? copy('Xác nhận đóng', 'Confirm close') : copy('Xác nhận xóa', 'Confirm deletion')}</button></div></section></div>}
  </div>
}
