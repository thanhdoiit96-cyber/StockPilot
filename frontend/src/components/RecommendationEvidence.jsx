import { uiText } from "../services/uiCatalog.mjs";
import { recommendationEvidence } from '../services/recommendationEvidence.mjs'
import { recommendationSignal } from '../services/recommendationSignal.mjs'


export default function RecommendationEvidence({ item, criteria = [], language = 'vi' }) {
  const ui = text => uiText(language, text)
  const en = language === 'en'
  const text = (vi, english) => en ? english : vi
  const number = value => value == null ? '—' : new Intl.NumberFormat(en ? 'en-US' : 'vi-VN', { maximumFractionDigits: 2 }).format(value)
  const dateTime = value => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat(en ? 'en-US' : 'vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : text('Chưa có thời điểm', 'Time unavailable')
  const evidence = recommendationEvidence(item, criteria)
  const signal = recommendationSignal(item, criteria)
  const score = value => new Intl.NumberFormat(en ? 'en-US' : 'vi-VN', { maximumFractionDigits: 1 }).format(value)
  const labels = { pending: text('Đang chờ đủ kỳ hạn', 'Awaiting horizon'), eligible: text('Outcome đủ điều kiện kiểm chứng', 'Eligible measured outcome'), excluded: text('Outcome bị loại khỏi thống kê', 'Outcome excluded from statistics'), untracked: text('Chưa có theo dõi outcome', 'Outcome tracking unavailable') }
  return <section className="recommendation-signal" aria-label={text('Cơ sở và vòng đời tín hiệu', 'Signal evidence and lifecycle')} lang={language}>
    <div className="recommendation-signal-heading"><strong>{text('Cơ sở xếp hạng', 'Ranking explanation')}</strong><span className={`chip ${signal.state === 'excluded' ? 'warning' : 'neutral'}`}>{labels[signal.state]}</span></div>
    <p className="recommendation-signal-progress">{text('Giá tham chiếu ghi nhận', 'Reference observed')}: {dateTime(evidence.observedAt)}</p>
    {signal.supporting.length ? <dl className="recommendation-signal-factors"><div><dt>{text('Tiêu chí điểm cao nhất', 'Highest-scoring criteria')}</dt><dd>{signal.supporting.map(factor => `${ui(factor.label)} ${score(factor.score)}/100`).join(' · ')}</dd></div>{signal.review && <div><dt>{text('Tiêu chí cần xem kỹ', 'Criterion to review')}</dt><dd>{ui(signal.review.label)} {score(signal.review.score)}/100</dd></div>}</dl> : <p className="muted-text">{text('Chưa có chi tiết điểm để giải thích thứ hạng.', 'Criterion scores are unavailable for explaining this ranking.')}</p>}
    <p className="recommendation-signal-progress">{text('Kỳ hạn', 'Horizon')}: {signal.horizon == null ? '—' : `${signal.horizon} ${text('phiên giao dịch', 'trading sessions')}`}{signal.state === 'pending' && signal.observed != null ? ` · ${text('Đã quan sát', 'Observed')} ${signal.observed} ${text('phiên', 'sessions')}` : ''}{signal.returnPct != null ? ` · ${text('Biến động EOD từ giá tham chiếu', 'EOD change from reference')}: ${signal.returnPct > 0 ? '+' : ''}${score(signal.returnPct)}%` : ''}</p>
    <details className="recommendation-evidence">
    <summary>{text('Xem bằng chứng chấm điểm', 'View scoring evidence')}</summary>
    <div className="recommendation-evidence-body">
      <dl className="recommendation-provenance">
        <div><dt>{text('Mô hình', 'Model')}</dt><dd>{evidence.model || text('Chưa công bố', 'Not disclosed')}</dd></div><div><dt>{text('Nguồn giá', 'Price source')}</dt><dd>{evidence.priceSource || text('Chưa xác định', 'Unknown')}</dd></div>
        <div><dt>{text('Thời điểm giá', 'Price time')}</dt><dd>{dateTime(evidence.observedAt)}</dd></div><div><dt>{text('Số phiên đầu vào', 'Input sessions')}</dt><dd>{evidence.observations ?? text('Chưa công bố', 'Not disclosed')}</dd></div>
      </dl>
      <div className="recommendation-indicator-evidence" aria-label={ui("Chỉ báo đầu vào")}>
        <span>Xu hướng <b>{evidence.trend || 'Chưa có'}</b></span><span>{ui("RSI14")} <b>{number(evidence.rsi14)}</b></span><span>Momentum 10 phiên <b>{number(evidence.momentum10)}</b></span>
        <span>Biến động ngày <b>{evidence.volatilityPct == null ? '—' : `${number(evidence.volatilityPct)}%`}</b></span><span>Khối lượng TB <b>{evidence.averageVolume == null ? '—' : new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(evidence.averageVolume)}</b></span>
      </div>
      {evidence.factors.length ? <div className="recommendation-factor-table table-wrap"><table><thead><tr><th>{text('Tiêu chí', 'Criterion')}</th><th>{text('Điểm', 'Score')}</th><th>{text('Trọng số', 'Weight')}</th><th>{text('Hiệu chỉnh', 'Calibration')}</th></tr></thead><tbody>{evidence.factors.map(factor => <tr key={factor.key}><td>{factor.label}</td><td>{number(factor.score)}/100</td><td>{factor.weight == null ? text('Theo snapshot', 'From snapshot') : number(factor.weight)}</td><td>{factor.calibration == null ? '1,00×' : `${number(factor.calibration)}×`}</td></tr>)}</tbody></table></div> : <p className="muted-text">{text('Snapshot này chưa lưu chi tiết điểm từng tiêu chí.', 'This snapshot has no per-criterion score detail.')}</p>}
      {evidence.sources.length > 0 && <div className="recommendation-citations"><strong>{text('Nguồn ngoài hệ thống đã xác minh', 'Verified external sources')}</strong><ul>{evidence.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a><small>{source.source} · {dateTime(source.publishedAt)} · {source.type}</small></li>)}</ul></div>}
      <p className="muted-text recommendation-evidence-note">{text('Điểm số dùng provenance kỹ thuật. Nguồn ngoài hệ thống được liệt kê riêng để tham khảo, không được cộng điểm và không chứng minh quan hệ nhân quả.', 'Scores use technical provenance. External sources are listed separately for reference; they are not scored and do not prove causality.')}</p>
    </div>
    </details>
  </section>
}
