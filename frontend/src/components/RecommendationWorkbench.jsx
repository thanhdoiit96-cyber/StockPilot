import { uiText } from "../services/uiCatalog.mjs";
import { useEffect, useMemo, useState } from 'react'
import { requestJson } from '../services/api.mjs'
import { localizeApiError } from '../services/apiErrorCatalog.mjs'
import { serializeRecommendationCsv } from '../services/recommendationCsv.mjs'
import RecommendationEvidence from './RecommendationEvidence.jsx'
import RecommendationSnapshotComparison from './RecommendationSnapshotComparison.jsx'
import RecommendationHistoryReport from './RecommendationHistoryReport.jsx'
import QuickWatchlistButton from './QuickWatchlistButton.jsx'
import StockDetailLink from './StockDetailLink.jsx'

const defaults = { trend: 30, momentum: 25, rsi: 15, stability: 15, liquidity: 15 }
const criteria = [
  { key: 'trend', label: 'Xu hướng giá', description: 'Giá so với SMA20 và hướng xu hướng' },
  { key: 'momentum', label: 'Động lượng', description: 'Biến động giá trong khoảng 10 phiên' },
  { key: 'rsi', label: 'RSI cân bằng', description: 'Ưu tiên vùng động lượng vừa phải, tránh quá mua' },
  { key: 'stability', label: 'Ổn định / rủi ro', description: 'Điểm cao hơn khi biến động gần đây thấp' },
  { key: 'liquidity', label: 'Thanh khoản', description: 'Xếp hạng tương đối theo khối lượng 20 phiên' },
]
const money = value => value == null ? '—' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value) + ' đ'
export default function RecommendationWorkbench({ initialData, history = [], token, onAddToPortfolio, onOpenDetail, watchlistSymbols = [], onAddToWatchlist, language = 'vi' }) {
  const ui = text => uiText(language, text)
  const money = value => value == null ? '—' : new Intl.NumberFormat(language === 'en' ? 'en-US' : 'vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)
  const en = language === 'en'
  const labelFor = item => en ? ({ trend: 'Price trend', momentum: 'Momentum', rsi: 'Balanced RSI', stability: 'Stability / risk', liquidity: 'Liquidity' }[item.key] || item.label) : item.label
  const descriptionFor = item => en ? ({ trend: 'Price versus SMA20 and trend direction', momentum: 'Price movement over the last 10 sessions', rsi: 'Prefer balanced momentum and avoid overbought levels', stability: 'Higher when recent volatility is lower', liquidity: 'Relative ranking by 20-session volume' }[item.key] || item.description) : item.description
  const copy = (vi, english) => en ? english : vi
  const [weights, setWeights] = useState(() => {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem('stockpilot.recommendation.criteria') || '{}') } } catch { return defaults }
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [criteriaCollapsed, setCriteriaCollapsed] = useState(false)
  const [savedProposals, setSavedProposals] = useState(() => {
    try { return JSON.parse(localStorage.getItem('stockpilot.recommendation.saved') || '[]') } catch { return [] }
  })
  const [selectedProposalId, setSelectedProposalId] = useState('')
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + Number(value || 0), 0)
  const effectiveHistory = useMemo(() => history.filter(run => Number(run.measured_count) > 0), [history])

  useEffect(() => { localStorage.setItem('stockpilot.recommendation.criteria', JSON.stringify(weights)) }, [weights])
  useEffect(() => { setResult(null) }, [initialData?.run?.id])
  useEffect(() => {
    if (!token) return
    requestJson('/api/recommendations/saved', { token }).then(async response => {
      if (!Array.isArray(response.data)) return
      let local = []
      try { local = JSON.parse(localStorage.getItem('stockpilot.recommendation.saved') || '[]') } catch {}
      const serverIds = new Set(response.data.map(item => item.id))
      const pending = local.filter(item => item?.id && !serverIds.has(item.id) && item.criteria && item.result).slice(0, 20)
      const migrated = []
      for (const snapshot of pending) {
        try { const saved = await requestJson('/api/recommendations/saved', { method: 'POST', body: { criteria: snapshot.criteria, result: snapshot.result }, token }); if (saved.data?.id) migrated.push(saved.data) } catch {}
      }
      const next = [...migrated, ...response.data].slice(0, 20)
      setSavedProposals(next)
      localStorage.setItem('stockpilot.recommendation.saved', JSON.stringify(next))
    }).catch(() => {})
  }, [token])

  async function generate(event) {
    event?.preventDefault()
    setLoading(true); setError('')
    try {
      const response = await requestJson('/api/recommendations/personalized', { method: 'POST', body: { criteria: weights, limit: 10, horizon_days: 20 }, token })
      setResult(response.data)
      setCriteriaCollapsed(true)
      try {
        const saved = await requestJson('/api/recommendations/saved', { method: 'POST', body: { criteria: weights, result: response.data }, token })
        if (saved.data?.id) { setSavedProposals(current => { const next = [saved.data, ...current].slice(0, 20); localStorage.setItem('stockpilot.recommendation.saved', JSON.stringify(next)); return next }); setSelectedProposalId(saved.data.id) }
      } catch {
        const snapshot = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString(), criteria: { ...weights }, result: response.data }
        setSavedProposals(current => { const next = [snapshot, ...current].slice(0, 20); localStorage.setItem('stockpilot.recommendation.saved', JSON.stringify(next)); return next })
        setSelectedProposalId(snapshot.id)
      }
    } catch (requestError) { setError(localizeApiError(requestError, language)) } finally { setLoading(false) }
  }

  function loadProposal(snapshot) {
    setSelectedProposalId(snapshot?.id || '')
    setWeights(snapshot.criteria || defaults)
    setResult(snapshot.result || null)
    setError('')
  }

  async function deleteProposal(id) {
    try { await requestJson(`/api/recommendations/saved/${id}`, { method: 'DELETE', token }) } catch {}
    setSavedProposals(current => {
      const next = current.filter(item => item.id !== id)
      localStorage.setItem('stockpilot.recommendation.saved', JSON.stringify(next))
      if (selectedProposalId === id) setSelectedProposalId(next[0]?.id || '')
      return next
    })
  }

  const recommendations = result?.recommendations || initialData?.recommendations || []
  const watched = new Set(watchlistSymbols.map(symbol => String(symbol).toUpperCase()))
  const learning = result?.learning
  function exportRecommendations() {
    const generatedAt = result?.generated_at || initialData?.run?.created_at || initialData?.run?.as_of || new Date().toISOString()
    const csv = serializeRecommendationCsv({ recommendations, criteriaWeights: result?.criteria, criteriaDefinitions: criteria, generatedAt, model: result?.model || initialData?.run?.model, horizonDays: initialData?.run?.horizon_days, language })
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `stockpilot-recommendations-${String(generatedAt).slice(0, 10) || 'export'}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  return <section className="recommendations-page recommendation-workbench" lang={language}>    <div className="recommendation-command-header"><div><span className="eyebrow accent">{copy('ĐỀ XUẤT CÁ NHÂN', 'PERSONAL IDEAS')}</span><h2>{copy('Đề xuất theo tiêu chí của bạn', 'Ideas based on your criteria')}</h2><p className="muted-text">{copy('Chọn mức ưu tiên để xếp hạng các mã phù hợp với mục tiêu của bạn.', 'Set priorities to rank symbols for your goals.')}</p></div><span className="chip neutral">{copy('Mô hình giải thích được', 'Explainable model')}</span></div>{initialData?.risk?.concentration_warning && <div className="recommendation-risk-banner" role="status"><strong>{copy('Cảnh báo tập trung danh mục', 'Portfolio concentration warning')}</strong><span>{copy('Tỷ trọng ngành cao nhất đang ở mức', 'The largest sector share is')} {initialData.risk.max_sector_share_pct}%.</span><small>{copy('Đang chờ đo lường thêm', 'Waiting for')} {initialData.risk.pending || 0} {copy('kết quả.', 'more results.')}</small></div>}<section className="panel recommendation-criteria-panel">
      <div className="recommendation-section-heading"><div><span className="eyebrow accent">{copy('Tùy chỉnh', 'CUSTOMIZE')}</span><h3>{copy('Bạn muốn ưu tiên điều gì?', 'What should be prioritized?')}</h3><p className="muted-text">{copy('Tăng trọng số để tiêu chí ảnh hưởng nhiều hơn đến điểm tổng. Mỗi tiêu chí được chuẩn hóa khi tính.', 'Increase a weight to give a criterion more influence on the total score. Each criterion is normalized.')}</p></div><div className="criteria-heading-actions"><span className="criteria-total">{copy('Tổng trọng số', 'Total weight')} <strong>{totalWeight}</strong></span><button type="button" className="ghost-btn small-btn" aria-expanded={!criteriaCollapsed} aria-controls="recommendation-criteria-form" onClick={() => setCriteriaCollapsed(value => !value)}>{criteriaCollapsed ? copy('Mở tiêu chí', 'Open criteria') : copy('Thu gọn tiêu chí', 'Collapse criteria')}</button></div></div>
      <form id="recommendation-criteria-form" onSubmit={generate} hidden={criteriaCollapsed}>
        <div className="criteria-grid">{criteria.map(item => <label className="criteria-control" key={item.key}><span className="criteria-label"><strong>{labelFor(item)}</strong><b>{weights[item.key]} {copy('điểm ưu tiên', 'priority points')}</b></span><small>{descriptionFor(item)}</small><input type="range" min="0" max="60" step="5" value={weights[item.key]} aria-label={`${copy('Trọng số', 'Weight')} ${labelFor(item)}`} onChange={event => setWeights(current => ({ ...current, [item.key]: Number(event.target.value) }))} /></label>)}</div>
        <div className="criteria-actions"><p className="muted-text">{copy('Chỉ tiêu kỹ thuật có dữ liệu mới được chấm điểm; tin tức, tâm lý và vĩ mô chưa được cộng điểm nếu chưa có nguồn xác minh trong mô hình.', 'Only technical criteria with data are scored; news, sentiment and macro factors are excluded without verified model sources.')}</p><div className="criteria-action-buttons"><div className="saved-proposal-picker"><label htmlFor="saved-proposal-select">{copy('Đề xuất đã lưu', 'Saved ideas')}</label><select id="saved-proposal-select" className="saved-proposal-select" value={selectedProposalId} onChange={event => { const snapshot = savedProposals.find(item => item.id === event.target.value); setSelectedProposalId(event.target.value); if (snapshot) loadProposal(snapshot) }} disabled={!savedProposals.length}><option value="">{savedProposals.length ? copy('Chọn snapshot', 'Select snapshot') : copy('Chưa có bản lưu', 'No saved snapshots')}</option>{savedProposals.map(snapshot => <option value={snapshot.id} key={snapshot.id}>{new Date(snapshot.createdAt).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} · {snapshot.result?.recommendations?.length || 0} {copy(ui("mã"), 'symbols')}</option>)}</select><button type="button" className="ghost-btn small-btn" disabled={!selectedProposalId} onClick={() => loadProposal(savedProposals.find(item => item.id === selectedProposalId))}>{copy('Load', 'Load')}</button><button type="button" className="ghost-btn small-btn danger-btn" disabled={!selectedProposalId} onClick={() => deleteProposal(selectedProposalId)}>{copy(ui("Xóa"), 'Delete')}</button></div><button type="button" className="ghost-btn" onClick={() => setWeights(defaults)}>{copy('Khôi phục mặc định', 'Restore defaults')}</button><button type="submit" className="primary-btn" disabled={loading || totalWeight === 0}>{loading ? copy('Đang xếp hạng…', 'Ranking…') : copy('Tạo đề xuất cá nhân', 'Create personal ideas')}</button></div></div>
      </form>
      {error && <p role="alert" className="error-text">{error}</p>}
    </section>

    <RecommendationSnapshotComparison snapshots={savedProposals} language={language} />
    <div className="recommendation-grid personalized-results">
      <section className="panel insights-panel"><div className="recommendation-section-heading"><div><h3>{result ? ui("Kết quả theo tiêu chí đã chọn") : ui("Đề xuất hiện tại")}</h3><p className="muted-text">{result ? `Đã rà soát ${result.eligible_count} mã đủ ít nhất 50 phiên.` : ui("Dữ liệu snapshot gần nhất; hãy tạo đề xuất cá nhân để xếp hạng lại theo bộ lọc.")}</p></div>{recommendations.length > 0 && <div className="recommendation-result-actions"><span className="chip success">{recommendations.length} {ui("mã")}</span><button type="button" className="ghost-btn small-btn recommendation-export-btn" onClick={exportRecommendations}>{copy('Xuất CSV đề xuất', 'Export ideas CSV')}</button></div>}</div>
      {recommendations.length ? <ol className="insights-list personalized-list">{recommendations.map(item => { const score = Number(item.score || 0); const scoreTone = score >= 75 ? 'high' : score >= 55 ? 'medium' : 'low'; const symbol = item.stock?.code || item.symbol; const stockId = item.stock?.id || item.stock_id; const generatedAt = result?.generated_at || initialData?.run?.created_at || initialData?.run?.as_of; const source = result ? 'personalized' : 'scheduled'; return <li key={item.id || item.stock_id || item.symbol}><div className="recommendation-stock-heading"><StockDetailLink className="recommendation-symbol-link" stockId={stockId} symbol={symbol} onOpenDetail={onOpenDetail}><strong>{symbol}</strong></StockDetailLink><span className={`recommendation-score score-${scoreTone}`}><b>{score.toFixed(1)}</b><small>/100 {copy(ui("điểm"), 'points')}</small></span><span className="rank-label">{copy('Hạng', 'Rank')} {item.rank}</span><div className="recommendation-row-actions"><button type="button" className="ghost-btn small-btn recommendation-add-btn" onClick={() => onAddToPortfolio?.({ symbol, name: item.stock?.name || item.name || symbol, price: item.entry_price, recommendationContext: { source, symbol, model: result?.model || initialData?.run?.model || 'short_term_rule_v2', generated_at: generatedAt, horizon_days: Number(item.horizon_days || initialData?.run?.horizon_days || 20), score, rank: Number(item.rank), expected_entry_price: Number(item.entry_price), criteria: result?.criteria || null } })}>＋ {copy(ui("Thêm vào danh mục"), 'Add to portfolio')}</button><QuickWatchlistButton language={language} symbol={symbol} watched={watched.has(String(symbol).toUpperCase())} onAdd={onAddToWatchlist} /></div></div><p>{(item.rationale?.factors || []).slice(0, 3).join(' · ')}</p>{item.rationale?.score_parts && <div className="score-breakdown">{criteria.map(criterion => { const value = Math.max(0, Math.min(100, Number(item.rationale.score_parts[criterion.key] || 0))); return <span className={`criterion-${criterion.key}`} key={criterion.key} title={`${labelFor(criterion)}: ${value} ${copy(ui("điểm"), 'points')}`}><small>{labelFor(criterion)}</small><b>{value.toFixed(0)}<i>/100</i></b><span className="criterion-meter"><i style={{ width: `${value}%` }} /></span></span>})}</div>}<div className="recommendation-result-footer"><div className="recommendation-data-chips"><span>{copy('Giá tham chiếu', 'Reference price')} <b>{money(item.entry_price)}</b><small>{item.rationale?.reference_plan?.price_source === 'intraday' ? 'Intraday' : 'EOD fallback'}</small></span><span>RSI <b>{item.rationale?.indicators?.rsi14 == null ? '—' : Number(item.rationale.indicators.rsi14).toFixed(1)}</b></span><span>{copy(ui("Quan sát"), 'Observed')} <b>{item.rationale?.observations || item.rationale?.evidence?.objective?.observations || '—'} {copy(ui("phiên"), 'sessions')}</b></span></div></div><RecommendationEvidence item={item} criteria={criteria} language={language} /></li> })}</ol> : <p className="muted-text">{result ? copy('Chưa có mã đạt ngưỡng điểm với trọng số này. Hãy điều chỉnh tiêu chí rồi thử lại.', 'No symbols met the score threshold with these weights. Adjust the criteria and try again.') : copy('Chưa có đề xuất khả dụng.', 'No recommendations available.')}</p>}
        <p className="analysis-disclaimer">Điểm số hỗ trợ nghiên cứu, không phải lời khuyên hay lệnh mua bán.</p>
      </section>
      <section className="panel learning-panel"><span className="eyebrow accent">{copy('VÒNG PHẢN HỒI', 'FEEDBACK LOOP')}</span><h3>{copy('Hiệu quả các đợt đề xuất của hệ thống', 'Recommendation run performance')}</h3><p className="muted-text">{copy('Mỗi dòng lịch sử là một đợt đề xuất chung được tạo theo lịch. Hệ thống so giá tại thời điểm đề xuất với giá sau tối đa 20 phiên: lợi nhuận dương được tính là một mã dự báo tăng. “Tỷ lệ dương” là phần trăm mã có kết quả dương; “lợi nhuận trung bình” là mức sinh lời trung bình của các mã đã đo.', 'Each history row is a scheduled recommendation run. The system compares the reference price with the price after up to 20 sessions: a positive return counts as a correctly rising forecast. Hit rate is the share of positive outcomes; average return is the mean return of measured symbols.')}</p>
        <div className="learning-definition"><strong>{copy('Lịch sử chung và kết quả từng mã là hai thước đo riêng.', 'Aggregate history and per-symbol outcomes are separate measures.')}</strong><span>{copy('Bảng bên dưới đo các đợt đề xuất chung. Khi bạn thêm mã từ kết quả và lưu giao dịch, ứng dụng sẽ lưu điểm, giá tham chiếu và kỳ hạn cùng giao dịch; mục Theo dõi mã đã thêm từ đề xuất trong Danh mục cá nhân sẽ so giá thực tế của vị thế và kết quả ở cuối kỳ hạn.', 'The table measures scheduled runs. When you add a symbol and save a transaction, its score, reference price and horizon are retained for portfolio tracking.')}</span></div>
        <p className="muted-text">{copy('Khi có đủ dữ liệu đánh giá, kết quả từng tiêu chí từ các đợt chung có thể hiệu chỉnh nhẹ trọng số đề xuất tương lai. Đây là hiệu chỉnh thống kê, không chứng minh quan hệ nhân quả.', 'With enough evaluation data, criterion outcomes may slightly calibrate future weights. This is statistical calibration, not proof of causality.')}</p>
        <div className="learning-stat-grid"><div><small>{copy('Đợt đã có kết quả', 'Measured runs')}</small><strong>{effectiveHistory.length}</strong></div><div><small>{copy('Hit rate TB các đợt', 'Average hit rate')}</small><strong>{effectiveHistory.length ? `${(effectiveHistory.reduce((sum, run) => sum + Number(run.hit_rate_pct || 0), 0) / effectiveHistory.length).toFixed(1)}%` : '—'}</strong></div><div><small>{copy('Mã đã đo theo tiêu chí', 'Measured symbols')}</small><strong>{learning?.sample_count ?? 0}</strong></div></div>
        <div className={`learning-status ${learning?.status === 'calibrated' ? 'is-ready' : ''}`} role="status"><strong>{learning?.status === 'calibrated' ? copy('Đã bật hiệu chỉnh lịch sử', 'Historical calibration enabled') : copy('Đang thu thập dữ liệu đánh giá', 'Collecting evaluation data')}</strong><span>{learning ? `${learning.sample_count}/${learning.minimum_samples} ${copy('kết quả cần thiết.', 'required results.')}` : copy('Chưa có đủ kết quả lịch sử theo từng tiêu chí; trọng số học vẫn ở mức trung tính.', 'There are not enough per-criterion outcomes; learned weights remain neutral.')}</span></div>
        {learning?.evidence && <div className="calibration-list">{criteria.map(item => <span key={item.key}>{labelFor(item)}<b>{learning.evidence[item.key].adjustment.toFixed(2)}×</b><small>{learning.evidence[item.key].samples} {copy('mẫu', 'samples')}</small></span>)}</div>}
        <a className="ghost-btn small-btn" href="#recommendation-history-report-title">{copy('Xem lịch sử và báo cáo đánh giá', 'View history and evaluation reports')}</a>
      </section>
    </div>
    <RecommendationHistoryReport history={history} token={token} language={language} />
  </section>
}
