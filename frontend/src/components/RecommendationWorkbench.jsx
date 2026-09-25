import { useEffect, useMemo, useState } from 'react'
import { requestJson } from '../services/api.mjs'

const defaults = { trend: 30, momentum: 25, rsi: 15, stability: 15, liquidity: 15 }
const criteria = [
  { key: 'trend', label: 'Xu hướng giá', description: 'Giá so với SMA20 và hướng xu hướng' },
  { key: 'momentum', label: 'Động lượng', description: 'Biến động giá trong khoảng 10 phiên' },
  { key: 'rsi', label: 'RSI cân bằng', description: 'Ưu tiên vùng động lượng vừa phải, tránh quá mua' },
  { key: 'stability', label: 'Ổn định / rủi ro', description: 'Điểm cao hơn khi biến động gần đây thấp' },
  { key: 'liquidity', label: 'Thanh khoản', description: 'Xếp hạng tương đối theo khối lượng 20 phiên' },
]
const money = value => value == null ? '—' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value) + ' đ'

export default function RecommendationWorkbench({ initialData, history = [], token, onAddToPortfolio }) {
  const [weights, setWeights] = useState(() => {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem('stockpilot.recommendation.criteria') || '{}') } } catch { return defaults }
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedProposals, setSavedProposals] = useState(() => {
    try { return JSON.parse(localStorage.getItem('stockpilot.recommendation.saved') || '[]') } catch { return [] }
  })
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + Number(value || 0), 0)
  const effectiveHistory = useMemo(() => history.filter(run => Number(run.measured_count) > 0), [history])

  useEffect(() => { localStorage.setItem('stockpilot.recommendation.criteria', JSON.stringify(weights)) }, [weights])
  useEffect(() => { setResult(null) }, [initialData?.run?.id])

  async function generate(event) {
    event?.preventDefault()
    setLoading(true); setError('')
    try {
      const response = await requestJson('/api/recommendations/personalized', { method: 'POST', body: { criteria: weights, limit: 10, horizon_days: 20 }, token })
      setResult(response.data)
      const snapshot = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString(), criteria: { ...weights }, result: response.data }
      setSavedProposals(current => {
        const next = [snapshot, ...current].slice(0, 20)
        localStorage.setItem('stockpilot.recommendation.saved', JSON.stringify(next))
        return next
      })
    } catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
  }

  function loadProposal(snapshot) {
    setWeights(snapshot.criteria || defaults)
    setResult(snapshot.result || null)
    setError('')
  }

  function deleteProposal(id) {
    setSavedProposals(current => {
      const next = current.filter(item => item.id !== id)
      localStorage.setItem('stockpilot.recommendation.saved', JSON.stringify(next))
      return next
    })
  }

  const recommendations = result?.recommendations || initialData?.recommendations || []
  const learning = result?.learning
  return <section className="recommendations-page recommendation-workbench">    <div className="recommendation-command-header"><div><span className="eyebrow accent">ĐỀ XUẤT CÁ NHÂN</span><h2>Đề xuất theo tiêu chí</h2><p className="muted-text">Chọn mức ưu tiên để xếp hạng các mã phù hợp với mục tiêu của bạn.</p></div><span className="chip neutral">Mô hình giải thích được</span></div>{initialData?.risk?.concentration_warning && <div className="recommendation-risk-banner" role="status"><strong>Cảnh báo tập trung danh mục</strong><span>Tỷ trọng ngành cao nhất đang ở mức {initialData.risk.max_sector_share_pct}%.</span><small>Đang chờ đo lường thêm {initialData.risk.pending || 0} kết quả.</small></div>}<section className="panel recommendation-criteria-panel">
      <div className="recommendation-section-heading"><div><span className="eyebrow accent">Tùy chỉnh</span><h3>Bạn muốn ưu tiên điều gì?</h3><p className="muted-text">Tăng trọng số để tiêu chí ảnh hưởng nhiều hơn đến điểm tổng. Mỗi tiêu chí được chuẩn hóa khi tính.</p></div><span className="criteria-total">Tổng trọng số <strong>{totalWeight}</strong></span></div>
      <form onSubmit={generate}>
        <div className="criteria-grid">{criteria.map(item => <label className="criteria-control" key={item.key}><span className="criteria-label"><strong>{item.label}</strong><b>{weights[item.key]} điểm ưu tiên</b></span><small>{item.description}</small><input type="range" min="0" max="60" step="5" value={weights[item.key]} aria-label={`Trọng số ${item.label}`} onChange={event => setWeights(current => ({ ...current, [item.key]: Number(event.target.value) }))} /></label>)}</div>
        <div className="criteria-actions"><p className="muted-text">Chỉ tiêu kỹ thuật có dữ liệu mới được chấm điểm; tin tức, tâm lý và vĩ mô chưa được cộng điểm nếu chưa có nguồn xác minh trong mô hình.</p><div><button type="button" className="ghost-btn" onClick={() => setWeights(defaults)}>Khôi phục mặc định</button><button type="submit" className="primary-btn" disabled={loading || totalWeight === 0}>{loading ? 'Đang xếp hạng…' : 'Tạo đề xuất cá nhân'}</button></div></div>
      </form>
      {error && <p role="alert" className="error-text">{error}</p>}
      <section className="saved-proposals" aria-labelledby="saved-proposals-title">
        <div className="recommendation-section-heading"><div><span className="eyebrow accent">LƯU TRỮ</span><h3 id="saved-proposals-title">Đề xuất đã tạo</h3><p className="muted-text">Các bản lưu là snapshot bất biến. Bạn chỉ có thể tải lại hoặc xóa.</p></div><span className="chip neutral">{savedProposals.length}/20</span></div>
        {savedProposals.length ? <div className="saved-proposals-list">{savedProposals.map(snapshot => <article className="saved-proposal" key={snapshot.id}><div><strong>{new Date(snapshot.createdAt).toLocaleString('vi-VN')}</strong><small>{Object.entries(snapshot.criteria || {}).map(([key, value]) => `${key}: ${value}`).join(' · ')}</small><small>{snapshot.result?.recommendations?.length || 0} mã được đề xuất</small></div><div className="saved-proposal-actions"><button type="button" className="ghost-btn small-btn" onClick={() => loadProposal(snapshot)}>Load</button><button type="button" className="ghost-btn small-btn danger-btn" onClick={() => deleteProposal(snapshot.id)}>Xóa</button></div></article>)}</div> : <p className="muted-text saved-proposals-empty">Chưa có bản đề xuất nào được lưu.</p>}
      </section>
    </section>

    <div className="recommendation-grid personalized-results">
      <section className="panel insights-panel"><div className="recommendation-section-heading"><div><h3>{result ? 'Kết quả theo tiêu chí đã chọn' : 'Đề xuất hiện tại'}</h3><p className="muted-text">{result ? `Đã rà soát ${result.eligible_count} mã đủ ít nhất 50 phiên.` : 'Dữ liệu snapshot gần nhất; hãy tạo đề xuất cá nhân để xếp hạng lại theo bộ lọc.'}</p></div>{recommendations.length > 0 && <span className="chip success">{recommendations.length} mã</span>}</div>
        {recommendations.length ? <ol className="insights-list personalized-list">{recommendations.map(item => { const score = Number(item.score || 0); const scoreTone = score >= 75 ? 'high' : score >= 55 ? 'medium' : 'low'; const symbol = item.stock?.code || item.symbol; const generatedAt = result?.generated_at || initialData?.run?.created_at || initialData?.run?.as_of; const source = result ? 'personalized' : 'scheduled'; return <li key={item.id || item.stock_id || item.symbol}><div className="recommendation-stock-heading"><strong>{symbol}</strong><span className={`recommendation-score score-${scoreTone}`}><b>{score.toFixed(1)}</b><small>/100 điểm</small></span><span className="rank-label">Hạng {item.rank}</span><button type="button" className="ghost-btn small-btn recommendation-add-btn" onClick={() => onAddToPortfolio?.({ symbol, name: item.stock?.name || item.name || symbol, price: item.entry_price, recommendationContext: { source, symbol, model: result?.model || initialData?.run?.model || 'short_term_rule_v2', generated_at: generatedAt, horizon_days: Number(item.horizon_days || initialData?.run?.horizon_days || 20), score, rank: Number(item.rank), expected_entry_price: Number(item.entry_price), criteria: result?.criteria || null } })}>＋ Thêm vào danh mục</button></div><p>{(item.rationale?.factors || []).slice(0, 3).join(' · ')}</p>{item.rationale?.score_parts && <div className="score-breakdown">{criteria.map(criterion => { const value = Math.max(0, Math.min(100, Number(item.rationale.score_parts[criterion.key] || 0))); return <span className={`criterion-${criterion.key}`} key={criterion.key} title={`${criterion.label}: ${value} điểm`}><small>{criterion.label}</small><b>{value.toFixed(0)}<i>/100</i></b><span className="criterion-meter"><i style={{ width: `${value}%` }} /></span></span>})}</div>}<div className="recommendation-result-footer"><div className="recommendation-data-chips"><span>Giá tham chiếu <b>{money(item.entry_price)}</b><small>{item.rationale?.reference_plan?.price_source === 'intraday' ? 'Intraday' : 'EOD fallback'}</small></span><span>RSI <b>{item.rationale?.indicators?.rsi14 == null ? '—' : Number(item.rationale.indicators.rsi14).toFixed(1)}</b></span><span>Quan sát <b>{item.rationale?.observations || '—'} phiên</b></span></div></div></li> })}</ol> : <p className="muted-text">{result ? 'Chưa có mã đạt ngưỡng điểm với trọng số này. Hãy điều chỉnh tiêu chí rồi thử lại.' : 'Chưa có đề xuất khả dụng.'}</p>}
        <p className="analysis-disclaimer">Điểm số hỗ trợ nghiên cứu, không phải lời khuyên hay lệnh mua bán.</p>
      </section>
      <section className="panel learning-panel"><span className="eyebrow accent">VÒNG PHẢN HỒI</span><h3>Hiệu quả các đợt đề xuất của hệ thống</h3><p className="muted-text">Mỗi dòng lịch sử là một đợt đề xuất chung được tạo theo lịch. Hệ thống so giá tại thời điểm đề xuất với giá sau tối đa 20 phiên: lợi nhuận dương được tính là một mã dự báo tăng. “Tỷ lệ dương” là phần trăm mã có kết quả dương; “lợi nhuận trung bình” là mức sinh lời trung bình của các mã đã đo.</p>
        <div className="learning-definition"><strong>Lịch sử chung và kết quả từng mã là hai thước đo riêng.</strong><span>Bảng bên dưới đo các đợt đề xuất chung. Khi bạn thêm mã từ kết quả và lưu giao dịch, ứng dụng sẽ lưu điểm, giá tham chiếu và kỳ hạn cùng giao dịch; mục <b>Theo dõi mã đã thêm từ đề xuất</b> trong Danh mục cá nhân sẽ so giá thực tế của vị thế và kết quả ở cuối kỳ hạn.</span></div>
        <p className="muted-text">Khi có đủ dữ liệu đánh giá, kết quả từng tiêu chí từ các đợt chung có thể hiệu chỉnh nhẹ trọng số đề xuất tương lai. Đây là hiệu chỉnh thống kê, không chứng minh quan hệ nhân quả.</p>
        <div className="learning-stat-grid"><div><small>Đợt đã có kết quả</small><strong>{effectiveHistory.length}</strong></div><div><small>Hit rate TB các đợt</small><strong>{effectiveHistory.length ? `${(effectiveHistory.reduce((sum, run) => sum + Number(run.hit_rate_pct || 0), 0) / effectiveHistory.length).toFixed(1)}%` : '—'}</strong></div><div><small>Mã đã đo theo tiêu chí</small><strong>{learning?.sample_count ?? 0}</strong></div></div>
        <div className={`learning-status ${learning?.status === 'calibrated' ? 'is-ready' : ''}`} role="status"><strong>{learning?.status === 'calibrated' ? 'Đã bật hiệu chỉnh lịch sử' : 'Đang thu thập dữ liệu đánh giá'}</strong><span>{learning ? `${learning.sample_count}/${learning.minimum_samples} kết quả cần thiết.` : 'Chưa có đủ kết quả lịch sử theo từng tiêu chí; trọng số học vẫn ở mức trung tính.'}</span></div>
        {learning?.evidence && <div className="calibration-list">{criteria.map(item => <span key={item.key}>{item.label}<b>{learning.evidence[item.key].adjustment.toFixed(2)}×</b><small>{learning.evidence[item.key].samples} mẫu</small></span>)}</div>}
        <h4>Lịch sử các đợt đề xuất chung</h4>{history.length ? <div className="table-wrap"><table><thead><tr><th>Ngày đề xuất</th><th>Số mã đã đo / tổng mã</th><th>Mã dự báo tăng</th><th>Sinh lời TB các mã</th></tr></thead><tbody>{history.slice(0, 8).map(run => <tr key={run.id}><td>{run.as_of}</td><td>{run.measured_count}/{run.selected_count}</td><td>{run.hit_rate_pct == null ? 'Đang chờ' : `${run.hit_rate_pct}%`}</td><td>{run.average_forward_return_pct == null ? '—' : `${Number(run.average_forward_return_pct).toFixed(2)}%`}</td></tr>)}</tbody></table></div> : <p className="muted-text">Chưa có kỳ đánh giá đủ dữ liệu.</p>}
      </section>
    </div>
  </section>
}
