import { measurementReason } from '../services/recommendationMeasurement.mjs'

export default function RecommendationCohortProgress({ cohorts = [], language = 'vi' }) {
  const en = language === 'en'
  const text = (vi, english) => en ? english : vi
  const count = value => value != null && Number.isInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null
  return <section className="recommendation-cohort-progress" aria-label={text('Tiến độ kiểm chứng theo kỳ hạn', 'Validation progress by horizon')}>
    <h4>{text('Tiến độ kiểm chứng tín hiệu', 'Signal validation progress')}</h4>
    <p className="muted-text">{text('Mỗi mô hình và kỳ hạn được theo dõi riêng. Số liệu dưới đây đếm tín hiệu, không phải giao dịch hay lợi nhuận danh mục.', 'Each model and horizon is tracked separately. Counts represent signals, not trades or portfolio returns.')}</p>
    <div className="cohort-progress-grid">{cohorts.map(cohort => {
      const measured = count(cohort.measured_count), selected = count(cohort.selected_count), minimum = count(cohort.minimum_samples)
      const pending = count(cohort.pending_count), excluded = count(cohort.excluded_count)
      return <article className="cohort-progress-card" key={`${cohort.model}-${cohort.horizon_days}`}>
        <header><strong>{cohort.model || '—'}</strong><span>{cohort.horizon_days || '—'} {text('phiên', 'sessions')}</span></header>
        <dl><div><dt>{text('Đã chọn', 'Selected')}</dt><dd>{selected ?? '—'}</dd></div><div><dt>{text('Đủ bằng chứng', 'Eligible')}</dt><dd>{measured ?? '—'}</dd></div><div><dt>{text('Đang chờ', 'Pending')}</dt><dd>{pending ?? '—'}</dd></div><div><dt>{text('Bị loại', 'Excluded')}</dt><dd>{excluded ?? '—'}</dd></div></dl>
        {minimum > 0 && measured != null && <progress max={minimum} value={Math.min(measured, minimum)} aria-label={text('Mẫu hợp lệ so với ngưỡng so sánh', 'Eligible samples relative to comparison threshold')} />}
        <p>{cohort.status === 'ready_for_comparison' ? text('Đạt ngưỡng mẫu để so sánh', 'Sample threshold reached for comparison') : minimum > 0 && measured != null ? `${measured}/${minimum} ${text('mẫu hợp lệ cho ngưỡng so sánh', 'eligible samples toward comparison threshold')}` : text('Chưa có đánh giá mức sẵn sàng', 'Readiness unavailable')}</p>
        {excluded > 0 && <details className="cohort-exclusion-reasons"><summary>{text('Vì sao tín hiệu bị loại?', 'Why were signals excluded?')}</summary>
          {Array.isArray(cohort.exclusion_breakdown) && cohort.exclusion_breakdown.length ? <><ul>{cohort.exclusion_breakdown.map(row => <li key={row.reason}><span>{measurementReason({ exclusion_reasons: [row.reason] }, language)}</span><b>{count(row.count) ?? '—'}</b></li>)}</ul><small>{text('Một tín hiệu có thể có nhiều lý do; không cộng các số này thành tổng tín hiệu.', 'One signal can have multiple reasons; these counts cannot be summed as distinct signals.')}</small></> : <p>{text('Chưa có chi tiết lý do trong báo cáo này.', 'Reason details are unavailable for this report.')}</p>}
        </details>}
      </article>
    })}</div>
  </section>
}
