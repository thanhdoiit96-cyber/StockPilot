export default function DetailAnalysisStatus({ analysis, translate = value => value }) {
  const label = analysis.status === 'loading'
    ? 'Đang phân tích...'
    : analysis.data ? 'Đã phân tích' : 'Chưa phân tích'
  const tone = analysis.status === 'loading' ? 'neutral' : analysis.data ? 'success' : 'neutral'

  return <>
    <div className="analysis-status-row"><h3>{translate('Phân tích chuyên sâu')}</h3><span className={`chip ${tone}`}>{label}</span></div>
    {analysis.error && <p role="alert">{analysis.error}</p>}
    {!analysis.data && !analysis.error && <div className="analysis-empty-state"><strong>{translate('Chưa có kết quả phân tích')}</strong><span>{analysis.status === 'loading' ? translate('Đang tải các chỉ báo kỹ thuật...') : translate('Nhấn Phân tích chuyên sâu để xem điểm số, chỉ báo và nhận định theo kỳ hạn.')}</span></div>}
  </>
}
