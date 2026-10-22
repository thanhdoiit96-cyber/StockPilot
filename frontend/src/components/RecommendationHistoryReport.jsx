import { useEffect, useRef, useState } from 'react'
import { requestJson } from '../services/api.mjs'
import { localizeApiError } from '../services/apiErrorCatalog.mjs'
import { serializeRecommendationHistoryCsv } from '../services/recommendationHistoryCsv.mjs'
import { measurementLabel, measurementReason } from '../services/recommendationMeasurement.mjs'

const percentage = value => value == null ? '—' : `${Number(value).toFixed(2)}%`

export default function RecommendationHistoryReport({ history = [], token, language = 'vi' }) {
  const en = language === 'en'
  const copy = (vi, english) => en ? english : vi
  const historicalCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  const containsHistoricalOnlyRuns = history.some(run => {
    const raw = run?.as_of || run?.created_at
    if (!raw) return false
    const parsed = Date.parse(raw)
    return Number.isFinite(parsed) && parsed < historicalCutoff
  })
  const [selectedId, setSelectedId] = useState('')
  const [visibleRuns, setVisibleRuns] = useState(8)
  const reportRequest = useRef(0)
  const [report, setReport] = useState(null)
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')
  const [cohortState, setCohortState] = useState('loading')
  const [cohorts, setCohorts] = useState([])
  const [sectorCohorts, setSectorCohorts] = useState([])
  const [sectorTaxonomy, setSectorTaxonomy] = useState(null)
  const [pendingIntegrity, setPendingIntegrity] = useState(null)

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
      setSectorCohorts(Array.isArray(response.data?.sector_cohorts) ? response.data.sector_cohorts : [])
      setSectorTaxonomy(response.data?.sector_taxonomy || null)
      setPendingIntegrity(response.data?.pending_integrity || null)
      setCohortState('success')
    }).catch(() => { if (active) setCohortState('error') })
    return () => { active = false }
  }, [token])

  async function openReport(id) {
    const requestId = ++reportRequest.current
    setSelectedId(id); setState('loading'); setError(''); setReport(null)
    try {
      const response = await requestJson(`/api/recommendations/history/${encodeURIComponent(id)}`, { token })
      if (requestId !== reportRequest.current) return
      setReport(response.data); setState('success')
    } catch (requestError) {
      if (requestId !== reportRequest.current) return
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
      <div><span className="eyebrow accent">{copy('BÁO CÁO LỊCH SỬ', 'HISTORICAL REPORT')}</span><h3 id="recommendation-history-report-title">{copy('Đánh giá từng snapshot đề xuất', 'Evaluate each recommendation snapshot')}</h3><p className="muted-text">{copy('Chọn một đợt để xem mã đã chọn, phần đã đo và phần đang chờ. Giữ nguyên kết quả gốc; điều kiện thống kê được đối chiếu với bằng chứng hiện có. Hiển thị tối đa 50 đợt gần nhất.', 'Choose a run to review its selected symbols, measured outcomes and pending rows. Original results are preserved; statistical eligibility is checked against available evidence. Shows up to 50 recent runs.')}</p></div>
      {report && <button type="button" className="ghost-btn small-btn recommendation-export-btn" onClick={exportReport}>{copy('Xuất CSV báo cáo', 'Export report CSV')}</button>}
    </div>
    {containsHistoricalOnlyRuns && <div className="recommendation-history-archive-banner" role="note"><strong>{copy('Lưu ý:', 'Note:')}</strong> {copy('Bảng dưới đây là lịch sử snapshot đã lưu; đây không phải dự báo thị trường hiện tại và không thể được xem như tín hiệu live.', 'This table is a historical snapshot archive; it is not a current market forecast and should not be interpreted as a live signal.')}</div>}
    {history.length ? <div className="table-wrap recommendation-history-table"><table><thead><tr><th>{copy('Ngày', 'Date')}</th><th>{copy('Đủ bằng chứng / chọn', 'Eligible / selected')}</th><th>{copy('Tỷ lệ dương', 'Positive rate')}</th><th>{copy('Lợi nhuận TB', 'Average return')}</th><th><span className="sr-only">{copy('Thao tác', 'Action')}</span></th></tr></thead><tbody>{history.slice(0, visibleRuns).map(run => <tr key={run.id} className={selectedId === run.id ? 'is-selected' : ''}><td>{run.as_of}</td><td>{run.measured_count}/{run.selected_count}<small>{run.pending_count ? ` · ${run.pending_count} ${copy('chờ', 'pending')}` : ''}</small>{run.excluded_count > 0 && <small> · {run.excluded_count} {copy('không tính thống kê', 'excluded')}</small>}</td><td>{percentage(run.hit_rate_pct)}</td><td>{percentage(run.average_forward_return_pct)}</td><td><button type="button" className="ghost-btn small-btn" onClick={() => openReport(run.id)} disabled={state === 'loading' && selectedId === run.id}>{state === 'loading' && selectedId === run.id ? copy('Đang tải…', 'Loading…') : copy('Xem báo cáo', 'View report')}</button></td></tr>)}</tbody></table></div> : <p className="muted-text">{copy('Chưa có snapshot đề xuất để lập báo cáo.', 'There are no recommendation snapshots to report yet.')}</p>}
    {history.length > visibleRuns && <button type="button" className="ghost-btn small-btn" onClick={() => setVisibleRuns(count => count + 8)}>{copy('Xem thêm đợt đề xuất', 'Show more runs')}</button>}
    {error && <p role="alert" className="error-text">{error}</p>}
    {report && <div className="snapshot-report-detail" aria-live="polite">
      <div className="snapshot-report-heading"><div><h4>{copy('Snapshot', 'Snapshot')} · {report.as_of}</h4><p className="muted-text">{report.model || '—'} · {report.horizon_days} {copy('phiên theo dõi', 'sessions')}</p></div><span className="chip neutral">{report.provider || '—'}</span></div>
      <div className="snapshot-report-stats"><div><small>{copy('Đủ bằng chứng', 'Eligible symbols')}</small><strong>{report.summary?.measured_count ?? 0}/{report.selected_count ?? 0}</strong></div><div><small>{copy('Tỷ lệ dương', 'Positive rate')}</small><strong>{percentage(report.summary?.hit_rate_pct)}</strong></div><div><small>{copy('Lợi nhuận forward TB', 'Average forward return')}</small><strong>{percentage(report.summary?.average_forward_return_pct)}</strong></div><div><small>{copy('Đang chờ', 'Pending')}</small><strong>{report.summary?.pending_count ?? 0}</strong></div></div>
      <p className="snapshot-report-note">{copy('Chỉ kết quả có bản chụp đã xác minh, đủ ngày giá quan sát cùng nguồn và lợi nhuận khớp mới được tính thống kê. Đây chưa phải xác nhận lịch phiên đầy đủ. Kết quả gốc bị loại được giữ riêng trong CSV, không phải lợi nhuận đã xác minh.', 'Statistics include only verified snapshots with sufficient same-source observed price dates and matching returns. This does not certify complete exchange-calendar coverage. Excluded original results remain separately labelled in CSV, not as verified returns.')} {report.summary?.excluded_count || 0} {copy('mã không tính thống kê.', 'symbols excluded from statistics.')}</p>
      <div className="table-wrap"><table><thead><tr><th>{copy('Hạng', 'Rank')}</th><th>{copy('Mã', 'Symbol')}</th><th>{copy('Điểm', 'Score')}</th><th>{copy('Giá tham chiếu', 'Reference price')}</th><th>{copy('Trạng thái', 'Status')}</th><th>{copy('Return forward', 'Forward return')}</th><th>{copy('Đánh giá lúc', 'Evaluated at')}</th></tr></thead><tbody>{report.recommendations.map(item => <tr key={item.id}><td>{item.rank}</td><td><strong>{item.stock?.code || '—'}</strong><small>{item.stock?.name || ''}</small></td><td>{Number(item.score || 0).toFixed(1)}</td><td>{item.entry_price == null ? '—' : new Intl.NumberFormat(en ? 'en-US' : 'vi-VN').format(item.entry_price)}</td><td><span className={`outcome-chip outcome-${item.statistics_eligible ? item.outcome : 'pending'}`}>{!item.statistics_eligible ? measurementLabel(item, language) : item.outcome === 'positive' ? copy('Dương', 'Positive') : item.outcome === 'negative' ? copy('Âm', 'Negative') : item.outcome === 'flat' ? copy('Đi ngang', 'Flat') : copy('Chờ đo', 'Pending')}</span>{item.measurement_status === 'pending' && <small>{copy(`Đã có ${item.observed_session_count || 0}/${item.horizon_days} phiên EOD; còn ${item.remaining_session_count ?? item.horizon_days} phiên.`, `${item.observed_session_count || 0}/${item.horizon_days} EOD sessions observed; ${item.remaining_session_count ?? item.horizon_days} remaining.`)}</small>}{item.exclusion_reasons?.length > 0 && <small>{measurementReason(item, language)}</small>}</td><td>{percentage(item.statistics_eligible ? item.forward_return_pct : null)}</td><td>{item.evaluated_at ? new Date(item.evaluated_at).toLocaleDateString(en ? 'en-US' : 'vi-VN') : '—'}</td></tr>)}</tbody></table></div>
      <p className="snapshot-provenance"><strong>{copy('Provenance:', 'Provenance:')}</strong> {copy('snapshot', 'snapshot')} {report.id} · {copy('tạo lúc', 'created')} {report.created_at ? new Date(report.created_at).toLocaleString(en ? 'en-US' : 'vi-VN') : '—'} · {copy('nguồn', 'provider')} {report.provider || '—'} · {copy('mô hình', 'model')} {report.model || '—'}</p>
    </div>}
    <details className="recommendation-aggregate">
      <summary>{copy('Phân tích tổng hợp và chất lượng dữ liệu', 'Aggregate analysis and data quality')}</summary>
    <div className="cohort-summary" aria-live="polite"><div><h4>{copy('So sánh cohort theo mô hình và kỳ theo dõi', 'Cohorts by model and observation horizon')}</h4><p className="muted-text">{copy('Chỉ cohort đủ mẫu mới được đặt ở trạng thái sẵn sàng so sánh. Đây là kết quả out-of-sample đã lưu, không phải dự báo hay cam kết lợi nhuận.', 'Only cohorts with enough samples are marked ready to compare. These are stored out-of-sample outcomes, not forecasts or return promises.')}</p></div>{cohortState === 'loading' ? <p className="muted-text">{copy('Đang tải cohort…', 'Loading cohorts…')}</p> : cohorts.length ? <div className="cohort-grid">{cohorts.map(cohort => <article key={`${cohort.model}-${cohort.horizon_days}`} className="cohort-card"><div><strong>{cohort.model}</strong><span>{cohort.horizon_days || '—'} {copy('phiên', 'sessions')}</span></div><dl><div><dt>{copy('Đã đo', 'Measured')}</dt><dd>{cohort.measured_count}/{cohort.selected_count}</dd></div><div><dt>{copy('Tỷ lệ dương', 'Positive rate')}</dt><dd>{percentage(cohort.hit_rate_pct)}</dd></div><div><dt>{copy('Trung vị', 'Median')}</dt><dd>{percentage(cohort.return_distribution?.median_pct)}</dd></div><div><dt>{copy('P25 – P75', 'P25 – P75')}</dt><dd>{cohort.return_distribution ? `${percentage(cohort.return_distribution.p25_pct)} – ${percentage(cohort.return_distribution.p75_pct)}` : '—'}</dd></div></dl><p className={`cohort-status ${cohort.status === 'ready_for_comparison' ? 'is-ready' : ''}`}>{cohort.status === 'ready_for_comparison' ? copy('Đủ mẫu để so sánh', 'Enough samples to compare') : `${cohort.measured_count}/${cohort.minimum_samples} ${copy('mẫu cần thiết', 'samples required')}`}</p></article>)}</div> : <p className="muted-text">{copy('Chưa có kết quả đã đo để lập cohort.', 'There are no measured outcomes to form cohorts yet.')}</p>}</div>
    {cohortState === 'success' && pendingIntegrity && <div className={`pending-integrity ${pendingIntegrity.blocked_runs ? 'is-blocked' : 'is-verified'}`}><strong>{copy('Khả năng đánh giá snapshot đang chờ', 'Pending snapshot evaluation readiness')}</strong><span>{pendingIntegrity.pending_runs === 0 ? copy('Không có snapshot đang chờ đo.', 'There are no pending snapshots.') : pendingIntegrity.blocked_runs ? `${pendingIntegrity.verified_runs}/${pendingIntegrity.pending_runs} ${copy('snapshot sẵn sàng; còn lại bị chặn integrity.', 'snapshots are ready; the rest are integrity-blocked.')}` : `${pendingIntegrity.verified_runs}/${pendingIntegrity.pending_runs} ${copy('snapshot đã xác minh và sẵn sàng cho evaluator.', 'snapshots are verified and ready for the evaluator.')}`}</span></div>}
    {cohortState === 'success' && <div className="sector-cohort-summary"><h4>{copy('Cohort theo ngành tại thời điểm snapshot', 'Sector cohorts captured with each snapshot')}</h4><p className="muted-text">{copy('Chỉ dùng ngành được lưu cùng snapshot, không lấy ngành hiện tại để diễn giải lịch sử.', 'Uses only the industry stored with the snapshot; current classifications are never used to reinterpret history.')}</p>{sectorCohorts.length ? <div className="cohort-grid">{sectorCohorts.map(cohort => <article key={`${cohort.model}-${cohort.horizon_days}-${cohort.industry}`} className="cohort-card"><div><strong>{cohort.industry}</strong><span>{cohort.horizon_days || '—'} {copy('phiên', 'sessions')}</span></div><dl><div><dt>{copy('Đã đo', 'Measured')}</dt><dd>{cohort.measured_count}/{cohort.selected_count}</dd></div><div><dt>{copy('Tỷ lệ dương', 'Positive rate')}</dt><dd>{percentage(cohort.hit_rate_pct)}</dd></div></dl><p className={`cohort-status ${cohort.status === 'ready_for_comparison' ? 'is-ready' : ''}`}>{cohort.status === 'ready_for_comparison' ? copy('Đủ mẫu để so sánh', 'Enough samples to compare') : `${cohort.measured_count}/${cohort.minimum_samples} ${copy('mẫu cần thiết', 'samples required')}`}</p></article>)}</div> : <p className="muted-text">{copy('Snapshot cũ chưa lưu ngành tại thời điểm tạo; cohort ngành sẽ xuất hiện từ các snapshot mới có provenance taxonomy.', 'Older snapshots did not capture industry at creation. Sector cohorts will appear only for new snapshots with taxonomy provenance.')}</p>}{sectorTaxonomy?.excluded_without_snapshot_taxonomy ? <p className="taxonomy-note">{sectorTaxonomy.excluded_without_snapshot_taxonomy} {copy('mã lịch sử không có taxonomy snapshot nên đã được loại khỏi cohort ngành.', 'historical symbols have no snapshot taxonomy and are excluded from sector cohorts.')}</p> : null}</div>}
    </details>
  </section>
}
