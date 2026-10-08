import { recommendationEvidence } from './recommendationEvidence.mjs'
import { measurementLabel, measurementReason } from './recommendationMeasurement.mjs'

function csvCell(value) {
  const text = value == null ? '' : String(value).replace(/\r\n?/g, '\n')
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

const headers = {
  vi: ['Snapshot ID', 'Ngày snapshot', 'Mô hình', 'Nhà cung cấp', 'Kỳ theo dõi (phiên)', 'Hạng', 'Mã', 'Doanh nghiệp', 'Điểm', 'Giá tham chiếu (VND)', 'Nguồn giá', 'Thời điểm quan sát giá', 'Trạng thái đo lường', 'Lợi nhuận forward (%)', 'Thời điểm đánh giá', 'Nguồn đã xác minh'],
  en: ['Snapshot ID', 'Snapshot date', 'Model', 'Provider', 'Horizon (sessions)', 'Rank', 'Symbol', 'Company', 'Score', 'Reference price (VND)', 'Price source', 'Price observed at', 'Measurement status', 'Forward return (%)', 'Evaluated at', 'Verified sources'],
}

/** Exports only data captured in the selected snapshot; pending rows remain return-free. */
export function serializeRecommendationHistoryCsv({ report, language = 'vi' } = {}) {
  const activeHeaders = [...headers[language === 'en' ? 'en' : 'vi'], ...(language === 'en' ? ['Statistics eligibility', 'Exclusion reason', 'Stored outcome (unverified)', 'Stored return (unverified, %)'] : ['Điều kiện thống kê', 'Lý do loại', 'Kết quả gốc (chưa xác minh)', 'Lợi nhuận gốc (chưa xác minh, %)'])]
  const rows = (report?.recommendations || []).map(item => {
    const evidence = recommendationEvidence(item, [])
    const sources = evidence.sources.map(source => [source.source, source.title, source.publishedAt].filter(Boolean).join(' — ')).join(' | ')
    return [
      report.id, report.as_of, report.model, report.provider, report.horizon_days,
      item.rank, item.stock?.code, item.stock?.name, item.score, item.entry_price,
      evidence.priceSource, evidence.observedAt, item.measurement_status === 'excluded' ? 'excluded' : item.outcome || 'pending',
      item.statistics_eligible === true ? item.forward_return_pct : '', item.evaluated_at, sources,
      measurementLabel(item, language), measurementReason(item, language),
      item.measurement_status === 'excluded' ? item.outcome : '',
      item.measurement_status === 'excluded' ? item.forward_return_pct : '',
    ].map(csvCell).join(',')
  })
  return `\uFEFF${[activeHeaders.map(csvCell).join(','), ...rows].join('\r\n')}\r\n`
}
