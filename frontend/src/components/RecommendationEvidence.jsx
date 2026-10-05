import { recommendationEvidence } from '../services/recommendationEvidence.mjs'

const number = value => value == null ? '—' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)
const dateTime = value => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : 'Chưa có thời điểm'

export default function RecommendationEvidence({ item, criteria = [] }) {
  const evidence = recommendationEvidence(item, criteria)
  return <details className="recommendation-evidence">
    <summary>Xem bằng chứng chấm điểm</summary>
    <div className="recommendation-evidence-body">
      <dl className="recommendation-provenance">
        <div><dt>Mô hình</dt><dd>{evidence.model || 'Chưa công bố'}</dd></div><div><dt>Nguồn giá</dt><dd>{evidence.priceSource || 'Chưa xác định'}</dd></div>
        <div><dt>Thời điểm giá</dt><dd>{dateTime(evidence.observedAt)}</dd></div><div><dt>Số phiên đầu vào</dt><dd>{evidence.observations ?? 'Chưa công bố'}</dd></div>
      </dl>
      <div className="recommendation-indicator-evidence" aria-label="Chỉ báo đầu vào">
        <span>Xu hướng <b>{evidence.trend || 'Chưa có'}</b></span><span>RSI14 <b>{number(evidence.rsi14)}</b></span><span>Momentum 10 phiên <b>{number(evidence.momentum10)}</b></span>
        <span>Biến động ngày <b>{evidence.volatilityPct == null ? '—' : `${number(evidence.volatilityPct)}%`}</b></span><span>Khối lượng TB <b>{evidence.averageVolume == null ? '—' : new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(evidence.averageVolume)}</b></span>
      </div>
      {evidence.factors.length ? <div className="recommendation-factor-table table-wrap"><table><thead><tr><th>Tiêu chí</th><th>Điểm</th><th>Trọng số</th><th>Hiệu chỉnh</th></tr></thead><tbody>{evidence.factors.map(factor => <tr key={factor.key}><td>{factor.label}</td><td>{number(factor.score)}/100</td><td>{factor.weight == null ? 'Theo snapshot' : number(factor.weight)}</td><td>{factor.calibration == null ? '1,00×' : `${number(factor.calibration)}×`}</td></tr>)}</tbody></table></div> : <p className="muted-text">Snapshot này chưa lưu chi tiết điểm từng tiêu chí.</p>}
      {evidence.sources.length > 0 && <div className="recommendation-citations"><strong>Nguồn ngoài hệ thống đã xác minh</strong><ul>{evidence.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a><small>{source.source} · {dateTime(source.publishedAt)} · {source.type}</small></li>)}</ul></div>}
      <p className="muted-text recommendation-evidence-note">Điểm số dùng provenance kỹ thuật. Nguồn ngoài hệ thống được liệt kê riêng để tham khảo, không được cộng điểm và không chứng minh quan hệ nhân quả.</p>
    </div>
  </details>
}
