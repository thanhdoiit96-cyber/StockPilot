import { useEffect, useMemo, useRef, useState } from 'react'
import { parsePortfolioLedgerCsv, serializePortfolioLedger } from '../services/portfolioLedgerCsv.mjs'

const number = value => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 }).format(Number(value || 0))
const money = value => `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(value || 0))} ₫`
const dateTime = value => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(date)
}

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

export default function PortfolioLedger({ entries = [], onImport, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [importState, setImportState] = useState({ status: 'idle', rows: [], result: null, fileName: '', error: '' })
  const [mutation, setMutation] = useState(null)
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
      setImportState({ status: 'loading', rows: [], result: null, fileName: file.name, error: '' })
      const rows = parsePortfolioLedgerCsv(await file.text())
      const result = await onImport(rows, true)
      setImportState({ status: 'preview', rows, result, fileName: file.name, error: '' })
    } catch (error) {
      setImportState({ status: 'error', rows: [], result: null, fileName: file.name, error: error.message })
    }
  }
  const commitImport = async () => {
    try {
      setImportState(state => ({ ...state, status: 'committing', error: '' }))
      const result = await onImport(importState.rows, false)
      setImportState({ status: 'success', rows: [], result, fileName: importState.fileName, error: '' })
    } catch (error) {
      setImportState(state => ({ ...state, status: 'error', error: error.message }))
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

  const openEdit = entry => setMutation({
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
      setMutation(null)
    } catch (error) {
      setMutation(state => ({ ...state, status: 'confirm', error: error.message }))
    }
  }
  const confirmDelete = async () => {
    try {
      setMutation(state => ({ ...state, status: 'saving', error: '' }))
      await onDelete(mutation.entry.id)
      setMutation(null)
    } catch (error) {
      setMutation(state => ({ ...state, status: 'confirm', error: error.message }))
    }
  }

  return <article className="panel portfolio-ledger-panel">
    <div className="portfolio-ledger-heading">
      <div>
        <h3>Nhật ký giao dịch</h3>
        <p className="muted-text">Lịch sử mua/bán đã ghi nhận; xuất CSV không thay đổi dữ liệu.</p>
      </div>
      <div className="portfolio-ledger-actions">
        <span className="chip neutral">{ordered.length} giao dịch</span>
        <button className="ghost-btn" type="button" onClick={() => exportCsv([], 'stockpilot-ledger-template.csv')}>Mẫu CSV</button>
        <label className={`ghost-btn portfolio-import-button${importState.status === 'loading' || importState.status === 'committing' ? ' disabled' : ''}`}>
          Nhập CSV
          <input type="file" accept=".csv,text/csv" disabled={!onImport || importState.status === 'loading' || importState.status === 'committing'} onChange={previewFile} />
        </label>
        <button className="ghost-btn" type="button" disabled={!ordered.length} onClick={() => exportCsv(ordered)}>Xuất CSV</button>
      </div>
    </div>
    {importState.status !== 'idle' ? <div className="portfolio-import-status" role="status" aria-live="polite">
      {(importState.status === 'loading' || importState.status === 'committing') && <p>{importState.status === 'loading' ? 'Đang kiểm tra file CSV…' : 'Đang nhập giao dịch…'}</p>}
      {importState.status === 'error' && <p className="error-text">{importState.error}</p>}
      {importState.status === 'success' && <p className="positive">Đã nhập {importState.result?.row_count || 0} giao dịch từ {importState.fileName}.</p>}
      {importState.status === 'preview' && <>
        <p><strong>{importState.fileName}</strong> · {importState.rows.length} dòng · {importState.result?.valid ? 'Sẵn sàng nhập' : 'Chưa thể nhập'}</p>
        {(importState.result?.errors || []).length ? <><ul>{importState.result.errors.slice(0, 10).map((error, index) => <li key={`${error.row}-${error.field}-${index}`}>Dòng {error.row || '-'} · {error.message}</li>)}</ul>{importState.result.errors.length > 10 ? <small>Còn {importState.result.errors.length - 10} lỗi khác.</small> : null}</> : null}
        <div className="portfolio-import-actions">
          <button className="ghost-btn" type="button" onClick={() => setImportState({ status: 'idle', rows: [], result: null, fileName: '', error: '' })}>Hủy</button>
          <button className="primary-btn" type="button" disabled={!importState.result?.valid} onClick={commitImport}>Nhập {importState.rows.length} giao dịch</button>
        </div>
      </>}
    </div> : null}
    {ordered.length ? <>
      <div className="table-wrap portfolio-ledger-table">
        <table aria-label="Nhật ký giao dịch danh mục">
          <thead><tr><th>Thời điểm</th><th>Mã</th><th>Loại</th><th>Số lượng</th><th>Giá</th><th>Phí</th><th>Nguồn</th><th>Thao tác</th></tr></thead>
          <tbody>{visible.map(entry => <tr key={entry.id || `${entry.symbol}-${entry.traded_at}`}>
            <td>{dateTime(entry.traded_at)}</td>
            <td><strong className="symbol">{entry.symbol || '-'}</strong>{entry.name ? <small>{entry.name}</small> : null}</td>
            <td><span className={`ledger-side ${entry.side === 'BUY' ? 'buy' : 'sell'}`}>{entry.side === 'BUY' ? 'Mua' : 'Bán'}</span></td>
            <td>{number(entry.quantity)}</td>
            <td>{money(entry.price)}</td>
            <td>{money(entry.fees)}</td>
            <td>{entry.source === 'recommendation' ? 'Đề xuất' : 'Thủ công'}</td>
            <td><div className="ledger-row-actions">
              <button className="ghost-btn small-btn" type="button" disabled={!onUpdate} onClick={() => openEdit(entry)}>Sửa</button>
              <button className="ghost-btn small-btn danger" type="button" disabled={!onDelete} onClick={() => setMutation({ kind: 'delete', entry, status: 'confirm', error: '' })}>Xóa</button>
            </div></td>
          </tr>)}</tbody>
        </table>
      </div>
      {ordered.length > 10 ? <button className="ghost-btn portfolio-ledger-toggle" type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Thu gọn' : `Xem tất cả ${ordered.length} giao dịch`}</button> : null}
    </> : <p className="muted-text portfolio-ledger-empty">Chưa có giao dịch nào được ghi nhận.</p>}
    {mutation ? <div className="ledger-dialog-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget && mutation.status !== 'saving') setMutation(null)
    }}>
      <section className="ledger-dialog" role="dialog" aria-modal="true" aria-labelledby="ledger-dialog-title" tabIndex={-1} ref={dialogRef}>
        {mutation.kind === 'edit' ? <form onSubmit={confirmEdit}>
          <h3 id="ledger-dialog-title">Xác nhận sửa giao dịch {mutation.entry.symbol}</h3>
          <p className="muted-text">Toàn bộ timeline sẽ được kiểm tra lại trước khi lưu.</p>
          <div className="ledger-edit-grid">
            <label>Loại giao dịch<select name="side" value={mutation.form.side} disabled={mutation.status === 'saving' || mutation.entry.source === 'recommendation'} onChange={updateField}><option value="BUY">Mua</option><option value="SELL">Bán</option></select></label>
            <label>Số lượng<input name="quantity" type="number" min="0.000001" step="any" required disabled={mutation.status === 'saving'} value={mutation.form.quantity} onChange={updateField} /></label>
            <label>Giá (VND/cổ phiếu)<input name="price" type="number" min="1" step="any" required disabled={mutation.status === 'saving'} value={mutation.form.price} onChange={updateField} /></label>
            <label>Phí (VND)<input name="fees" type="number" min="0" step="any" required disabled={mutation.status === 'saving'} value={mutation.form.fees} onChange={updateField} /></label>
            <label className="ledger-edit-time">Thời điểm giao dịch<input name="traded_at" type="datetime-local" required disabled={mutation.status === 'saving'} value={mutation.form.traded_at} onChange={updateField} /></label>
          </div>
          {mutation.entry.source === 'recommendation' ? <small>Giao dịch từ Đề xuất phải giữ loại Mua để bảo toàn nguồn đánh giá.</small> : null}
          {mutation.error ? <p className="error-text" role="alert">{mutation.error}</p> : null}
          <div className="ledger-dialog-actions"><button className="ghost-btn" type="button" disabled={mutation.status === 'saving'} onClick={() => setMutation(null)}>Hủy</button><button className="primary-btn" type="submit" disabled={mutation.status === 'saving'}>{mutation.status === 'saving' ? 'Đang kiểm tra…' : 'Xác nhận sửa'}</button></div>
        </form> : <>
          <h3 id="ledger-dialog-title">Xác nhận xóa giao dịch</h3>
          <p>Bạn sắp xóa giao dịch <strong>{mutation.entry.side === 'BUY' ? 'Mua' : 'Bán'} {number(mutation.entry.quantity)} {mutation.entry.symbol}</strong> lúc {dateTime(mutation.entry.traded_at)}.</p>
          <p className="muted-text">Thao tác chỉ được thực hiện nếu toàn bộ timeline còn lại vẫn hợp lệ.</p>
          {mutation.error ? <p className="error-text" role="alert">{mutation.error}</p> : null}
          <div className="ledger-dialog-actions"><button className="ghost-btn" type="button" disabled={mutation.status === 'saving'} onClick={() => setMutation(null)}>Hủy</button><button className="danger-btn" type="button" disabled={mutation.status === 'saving'} onClick={confirmDelete}>{mutation.status === 'saving' ? 'Đang kiểm tra…' : 'Xác nhận xóa'}</button></div>
        </>}
      </section>
    </div> : null}
  </article>
}
