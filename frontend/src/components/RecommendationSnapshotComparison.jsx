import { useEffect, useMemo, useState } from 'react'
import { compareRecommendationSnapshots } from '../services/recommendationSnapshotComparison.mjs'

const CRITERIA_LABELS = {
  trend: 'Xu hướng giá', momentum: 'Động lượng', rsi: 'RSI cân bằng',
  stability: 'An toàn / rủi ro', liquidity: 'Thanh khoản'
}
const snapshotLabel = snapshot => `${new Date(snapshot.createdAt).toLocaleString('vi-VN')} · ${snapshot.result?.recommendations?.length || 0} mã`
const signed = (value, digits = 0) => value == null ? '—' : `${value > 0 ? '+' : ''}${Number(value).toFixed(digits)}`

export default function RecommendationSnapshotComparison({ snapshots = [], language = 'vi' }) {
  const en = language === 'en'
  const text = (vi, english) => en ? english : vi
  const [baseId, setBaseId] = useState('')
  const [targetId, setTargetId] = useState('')
  useEffect(() => {
    const ids = new Set(snapshots.map(snapshot => String(snapshot.id)))
    setTargetId(current => ids.has(current) ? current : String(snapshots[0]?.id || ''))
    setBaseId(current => ids.has(current) ? current : String(snapshots[1]?.id || ''))
  }, [snapshots])
  const base = snapshots.find(snapshot => String(snapshot.id) === baseId)
  const target = snapshots.find(snapshot => String(snapshot.id) === targetId)
  const comparison = useMemo(() => base && target && baseId !== targetId
    ? compareRecommendationSnapshots(base, target)
    : null, [base, target, baseId, targetId])

  if (snapshots.length < 2) return <section className="panel snapshot-comparison" aria-labelledby="snapshot-comparison-title" lang={language}>
    <h3 id="snapshot-comparison-title">{text('So sánh snapshot', 'Snapshot comparison')}</h3>
    <p className="muted-text">{text('Cần ít nhất hai snapshot đã lưu để đối chiếu thay đổi tiêu chí và thứ hạng.', 'At least two saved snapshots are required to compare criteria and ranking changes.')}</p>
  </section>

  return <section className="panel snapshot-comparison" aria-labelledby="snapshot-comparison-title" lang={language}>
    <div className="recommendation-section-heading"><div><span className="eyebrow accent">{text('Bằng chứng thay đổi', 'Change evidence')}</span><h3 id="snapshot-comparison-title">{text('So sánh snapshot', 'Snapshot comparison')}</h3><p className="muted-text">{text('Đối chiếu hai lần xếp hạng đã lưu; không chạy lại mô hình và không thay đổi dữ liệu.', 'Compare two saved rankings without rerunning the model or changing data.')}</p></div></div>
    <div className="snapshot-comparison-controls">
      <label>Snapshot gốc<select className="app-select" value={baseId} onChange={event => setBaseId(event.target.value)}>{snapshots.map(snapshot => <option key={snapshot.id} value={snapshot.id} disabled={String(snapshot.id) === targetId}>{snapshotLabel(snapshot)}</option>)}</select></label>
      <label>Snapshot đối chiếu<select className="app-select" value={targetId} onChange={event => setTargetId(event.target.value)}>{snapshots.map(snapshot => <option key={snapshot.id} value={snapshot.id} disabled={String(snapshot.id) === baseId}>{snapshotLabel(snapshot)}</option>)}</select></label>
    </div>
    {comparison ? <>
      <div className="snapshot-comparison-summary" aria-label="Tóm tắt so sánh snapshot"><span className="chip success">Thêm {comparison.added}</span><span className="chip neutral">Giữ {comparison.retained}</span><span className="chip danger">Bớt {comparison.removed}</span></div>
      <p className="snapshot-criteria-delta">{comparison.criteria.length ? comparison.criteria.map(item => `${CRITERIA_LABELS[item.key] || item.key} ${signed(item.delta)}`).join(' · ') : 'Trọng số tiêu chí không thay đổi.'}</p>
      <div className="table-wrap snapshot-comparison-table"><table aria-label="Thay đổi giữa hai snapshot đề xuất"><thead><tr><th>Mã</th><th>Trạng thái</th><th>Hạng gốc</th><th>Hạng mới</th><th>Đổi hạng</th><th>Đổi điểm</th></tr></thead><tbody>{comparison.rows.map(row => <tr key={row.symbol}><td><strong className="symbol">{row.symbol}</strong></td><td><span className={`snapshot-change is-${row.status}`}>{row.status === 'added' ? 'Thêm' : row.status === 'removed' ? 'Bớt' : 'Giữ'}</span></td><td>{row.baseRank ?? '—'}</td><td>{row.targetRank ?? '—'}</td><td className={row.rankDelta > 0 ? 'positive' : row.rankDelta < 0 ? 'negative' : ''}>{signed(row.rankDelta)}</td><td className={row.scoreDelta > 0 ? 'positive' : row.scoreDelta < 0 ? 'negative' : ''}>{signed(row.scoreDelta, 1)}</td></tr>)}</tbody></table></div>
    </> : <p className="muted-text">Chọn hai snapshot khác nhau để so sánh.</p>}
  </section>
}
