import { useMemo, useState } from 'react'
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

export default function PortfolioLedger({ entries = [], onImport }) {
  const [expanded, setExpanded] = useState(false)
  const [importState, setImportState] = useState({ status: 'idle', rows: [], result: null, fileName: '', error: '' })
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
          <thead><tr><th>Thời điểm</th><th>Mã</th><th>Loại</th><th>Số lượng</th><th>Giá</th><th>Phí</th><th>Nguồn</th></tr></thead>
          <tbody>{visible.map(entry => <tr key={entry.id || `${entry.symbol}-${entry.traded_at}`}>
            <td>{dateTime(entry.traded_at)}</td>
            <td><strong className="symbol">{entry.symbol || '-'}</strong>{entry.name ? <small>{entry.name}</small> : null}</td>
            <td><span className={`ledger-side ${entry.side === 'BUY' ? 'buy' : 'sell'}`}>{entry.side === 'BUY' ? 'Mua' : 'Bán'}</span></td>
            <td>{number(entry.quantity)}</td>
            <td>{money(entry.price)}</td>
            <td>{money(entry.fees)}</td>
            <td>{entry.source === 'recommendation' ? 'Đề xuất' : 'Thủ công'}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {ordered.length > 10 ? <button className="ghost-btn portfolio-ledger-toggle" type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Thu gọn' : `Xem tất cả ${ordered.length} giao dịch`}</button> : null}
    </> : <p className="muted-text portfolio-ledger-empty">Chưa có giao dịch nào được ghi nhận.</p>}
  </article>
}
