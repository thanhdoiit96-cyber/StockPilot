import { useEffect, useState } from 'react'
import { requestJson } from '../services/api.mjs'
import { localizeApiError } from '../services/apiErrorCatalog.mjs'
import { serializeRecommendationHistoryCsv } from '../services/recommendationHistoryCsv.mjs'

const percentage = value => value == null ? '—' : `${Number(value).toFixed(2)}%`

export default function RecommendationHistoryReport({ history = [], token, language = 'vi' }) {
  const en = language === 'en'
  const copy = (vi, english) => en ? english : vi
  const [selectedId, setSelectedId] = useState('')
  const [report, setReport] = useState(null)
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')
  const [cohortState, setCohortState] = useState('loading')
  const [cohorts, setCohorts] = useState([])

  useEffect(() => {
    if (selectedId && !history.some(item => item.id === selectedId)) {
      setSelectedId(''); setReport(null); setState('idle')
    }
  }, [history, selectedId])

  useEffect(() => {
    let active = true
    setCohortState('loading')
    requestJson('/api/recommendations/history/summary', { token }).then(response => {
      if (!active) return
      setCohorts(Array.isArray(response.data?.cohorts) ? response.data.cohorts : [])
      setCohortState('success')
    }).catch(() => { if (active) setCohortState('error') })
    return () => { active = false }
  }, [token])

  async function openReport(id) {
    setSelectedId(id); setState('loading'); setError(''); setReport(null)
    try {
      const response = await requestJson(`/api/recommendations/history/${encodeURIComponent(id)}`, { token })
      setReport(response.data); setState('success')
    } catch (requestError) {
      setError(localizeApiError(requestError, language)); setState('error')
    }
  }

  function exportReport() {
    if (!report) return
    const csv = serializeRecommendationHistoryCsv({ report, language })
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `stockpilot-recommendation-report-${String(report.as_of || report.id).slice(0, 10)}.csv`
    document.body.appendChild(link); link.click(); link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return <section className="panel recommendation-history-report" aria-labelledby="recommendation-history-report-title">
    <div className="recommendation-section-heading">
      <div><span className="eyebrow accent">{copy('BÁO CÁO LỊCH SỬ', 'HISTORICAL REPORT')}</span><h3 id="recommendation-history-report-title">{copy('Đánh giá từng snapshot đề xuất', 'Evaluate each recommendation snapshot')}</h3><p className="muted-text">{copy('Chọn một đợt để xem mã đã chọn, phần đã đo và phần đang chờ. Báo cáo chỉ dùng dữ liệu bất biến đã lưu tại snapshot.', 'Choose a run to review its selected symbols, measured outcomes and pending rows. The report uses only immutable snapshot data.')}</p></div>
      {report && <button type="button" className="ghost-btn small-btn recommendation-export-btn" onClick={exportReport}>{copy('Xuất CSV báo cáo', 'Export report CSV')}</button>}
    </div>
    {history.length ? <div className="table-wrap recommendation-history-table"><table><thead><tr><th>{copy('Ngày', 'Date')}</th><th>{copy('Đã đo / chọn', 'Measured / selected')}</th><th>{copy('Tỷ lệ dương', 'Positive rate')}</th><th>{copy('Lợi nhuận TB', 'Average return')}</th><th><span className="sr-only">{copy('Thao tác', 'Action')}</span></th></tr></thead><tbody>{history.slice(0, 8).map(run => <tr key={run.id} className={selectedId === run.id ? 'is-selected' : ''}><td>{run.as_of}</td><td>{run.measured_count}/{run.selected_count}<small>{run.pending_count ? ` · ${run.pending_count} ${copy('chờ', 'pending')}` : ''}</small></td><td>{percentage(run.hit_rate_pct)}</td><td>{percentage(run.average_forward_return_pct)}</td><td><button type="button" className="ghost-btn small-btn" onClick={() => openReport(run.id)} disabled={state === 'loading' && selectedId === run.id}>{state === 'loading' && selectedId === run.id ? copy('Đang tải…', 'Loading…') : copy('Xem báo cáo', 'View report')}</button></td></tr>)}</tbody></table></div> : <p className="muted-text">{copy('Chưa có snapshot đề xuất để lập báo cáo.', 'There are no recommendation snapshots to report yet.')}</p>}
    <div className="cohort-summary" aria-live="polite"><div><h4>{copy('So sánh cohort theo mô hình và kỳ theo dõi', 'Cohorts by model and observation horizon')}</h4><p className="muted-text">{copy('Chỉ cohort đủ mẫu mới được đặt ở trạng thái sẵn sàng so sánh. Đây là kết quả out-of-sample đã lưu, không phải dự báo hay cam kết lợi nhuận.', 'Only cohorts with enough samples are marked ready to compare. These are stored out-of-sample outcomes, not forecasts or return promises.')}</p></div>{cohortState === 'loading' ? <p className="muted-text">{copy('Đang tải cohort…', 'Loading cohorts…')}</p> : cohorts.length ? <div className="cohort-grid">{cohorts.map(cohort => <article key={`${cohort.model}-${cohort.horizon_days}`} className="cohort-card"><div><strong>{cohort.model}</strong><span>{cohort.horizon_days || '—'} {copy('phiên', 'sessions')}</span></div><dl><div><dt>{copy('Đã đo', 'Measured')}</dt><dd>{cohort.measured_count}/{cohort.selected_count}</dd></div><div><dt>{copy('Tỷ lệ dương', 'Positive rate')}</dt><dd>{percentage(cohort.hit_rate_pct)}</dd></div><div><dt>{copy('Trung vị', 'Median')}</dt><dd>{percentage(cohort.return_distribution?.median_pct)}</dd></div><div><dt>{copy('P25 – P75', 'P25 – P75')}</dt><dd>{cohort.return_distribution ? `${percentage(cohort.return_distribution.p25_pct)} – ${percentage(cohort.return_distribution.p75_pct)}` : '—'}</dd></div></dl><p className={`cohort-status ${cohort.status === 'ready_for_comparison' ? 'is-ready' : ''}`}>{cohort.status === 'ready_for_comparison' ? copy('Đủ mẫu để so sánh', 'Enough samples to compare') : `${cohort.measured_count}/${cohort.minimum_samples} ${copy('mẫu cần thiết', 'samples required')}`}</p></article>)}</div> : <p className="muted-text">{copy('Chưa có kết quả đã đo để lập cohort.', 'There are no measured outcomes to form cohorts yet.')}</p>}</div>
    {error && <p role="alert" className="error-text">{error}</p>}
    {report && <div className="snapshot-report-detail" aria-live="polite">
      <div className="snapshot-report-heading"><div><h4>{copy('Snapshot', 'Snapshot')} · {report.as_of}</h4><p className="muted-text">{report.model || '—'} · {report.horizon_days} {copy('phiên theo dõi', 'sessions')}</p></div><span className="chip neutral">{report.provider || '—'}</span></div>
      <div className="snapshot-report-stats"><div><small>{copy('Mã đã đo', 'Measured symbols')}</small><strong>{report.summary?.measured_count ?? 0}/{report.selected_count ?? 0}</strong></div><div><small>{copy('Tỷ lệ dương', 'Positive rate')}</small><strong>{percentage(report.summary?.hit_rate_pct)}</strong></div><div><small>{copy('Lợi nhuận forward TB', 'Average forward return')}</small><strong>{percentage(report.summary?.average_forward_return_pct)}</strong></div><div><small>{copy('Đang chờ', 'Pending')}</small><strong>{report.summary?.pending_count ?? 0}</strong></div></div>
      <p className="snapshot-report-note">{copy('Chỉ mã đã hoàn tất kỳ quan sát mới có return và được tính vào tỷ lệ dương. Các mã chờ không được ước tính lợi nhuận.', 'Only completed observation windows have returns and count toward the positive rate. Pending symbols are never assigned estimated returns.')}</p>
      <div className="table-wrap"><table><thead><tr><th>{copy('Hạng', 'Rank')}</th><th>{copy('Mã', 'Symbol')}</th><th>{copy('Điểm', 'Score')}</th><th>{copy('Giá tham chiếu', 'Reference price')}</th><th>{copy('Trạng thái', 'Status')}</th><th>{copy('Return forward', 'Forward return')}</th><th>{copy('Đánh giá lúc', 'Evaluated at')}</th></tr></thead><tbody>{report.recommendations.map(item => <tr key={item.id}><td>{item.rank}</td><td><strong>{item.stock?.code || '—'}</strong><small>{item.stock?.name || ''}</small></td><td>{Number(item.score || 0).toFixed(1)}</td><td>{item.entry_price == null ? '—' : new Intl.NumberFormat(en ? 'en-US' : 'vi-VN').format(item.entry_price)}</td><td><span className={`outcome-chip outcome-${item.outcome}`}>{item.outcome === 'positive' ? copy('Dương', 'Positive') : item.outcome === 'negative' ? copy('Âm', 'Negative') : item.outcome === 'flat' ? copy('Đi ngang', 'Flat') : copy('Chờ đo', 'Pending')}</span></td><td>{percentage(item.forward_return_pct)}</td><td>{item.evaluated_at ? new Date(item.evaluated_at).toLocaleDateString(en ? 'en-US' : 'vi-VN') : '—'}</td></tr>)}</tbody></table></div>
      <p className="snapshot-provenance"><strong>{copy('Provenance:', 'Provenance:')}</strong> {copy('snapshot', 'snapshot')} {report.id} · {copy('tạo lúc', 'created')} {report.created_at ? new Date(report.created_at).toLocaleString(en ? 'en-US' : 'vi-VN') : '—'} · {copy('nguồn', 'provider')} {report.provider || '—'} · {copy('mô hình', 'model')} {report.model || '—'}</p>
    </div>}
  </section>
}
