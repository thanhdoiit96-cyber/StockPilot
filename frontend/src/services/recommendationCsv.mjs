import { recommendationEvidence } from './recommendationEvidence.mjs'

const finite = value => value !== null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : ''

function csvCell(value) {
  const text = value == null ? '' : String(value).replace(/\r\n?/g, '\n')
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

function summary(values, separator = ' | ') { return values.filter(Boolean).join(separator) }

function criteriaSummary(weights) {
  if (!weights || typeof weights !== 'object') return ''
  return Object.entries(weights).filter(([, value]) => finite(value) !== '').map(([key, value]) => `${key}:${finite(value)}`).join(', ')
}

const headers = {
  vi: ['Hạng', 'Mã', 'Doanh nghiệp', 'Điểm', 'Giá tham chiếu (VND)', 'Khung theo dõi (phiên)', 'Mô hình', 'Xu hướng', 'RSI 14', 'Momentum 10', 'Biến động (%)', 'Khối lượng TB', 'Số phiên quan sát', 'Nguồn giá', 'Thời điểm giá', 'Luận điểm', 'Nguồn đã xác minh', 'Tiêu chí tùy chỉnh', 'Thời điểm snapshot'],
  en: ['Rank', 'Symbol', 'Company', 'Score', 'Reference price (VND)', 'Horizon (sessions)', 'Model', 'Trend', 'RSI 14', 'Momentum 10', 'Volatility (%)', 'Average volume', 'Observed sessions', 'Price source', 'Price observed at', 'Rationale', 'Verified sources', 'Custom criteria', 'Snapshot generated at'],
}

/** Builds a user-owned export and intentionally excludes unverified links and internal model data. */
export function serializeRecommendationCsv({ recommendations = [], criteriaWeights, criteriaDefinitions = [], generatedAt, model, horizonDays, language = 'vi' } = {}) {
  const activeHeaders = headers[language === 'en' ? 'en' : 'vi']
  const rows = recommendations.map(item => {
    const evidence = recommendationEvidence(item, criteriaDefinitions)
    const sources = summary(evidence.sources.map(source => summary([source.source, source.title, source.publishedAt], ' — ')))
    return [
      finite(item.rank), item.stock?.code || item.symbol || '', item.stock?.name || item.name || '', finite(item.score), finite(item.entry_price), finite(item.horizon_days ?? horizonDays), evidence.model || model || '', evidence.trend || '', evidence.rsi14, evidence.momentum10, evidence.volatilityPct, evidence.averageVolume, evidence.observations, evidence.priceSource || '', evidence.observedAt || '', summary(Array.isArray(item.rationale?.factors) ? item.rationale.factors : []), sources, criteriaSummary(criteriaWeights), generatedAt || '',
    ].map(csvCell).join(',')
  })
  return `\uFEFF${[activeHeaders.map(csvCell).join(','), ...rows].join('\r\n')}\r\n`
}
