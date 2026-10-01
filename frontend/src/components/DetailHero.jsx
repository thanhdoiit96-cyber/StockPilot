const safeExternalUrl = value => {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

export default function DetailHero({ symbol, name, price, quote, eodFetchedAt, providerStatus, quoteError, analysis, onRequestAnalysis, onAddToPortfolio }) {
  const licenseUrl = safeExternalUrl(quote?.license_url)
  const statusMessage = providerStatus === 'circuit_open'
    ? 'Provider tạm ngắt; giá gần nhất vẫn được giữ và sẽ tự thử lại.'
    : providerStatus === 'degraded'
      ? 'Provider đang chậm; hệ thống sẽ tự cập nhật lại.'
      : quoteError
        ? quote ? 'Chưa cập nhật được intraday; đang giữ giá ghi nhận gần nhất.' : 'Chưa lấy được giá intraday; đang hiển thị EOD và sẽ tự thử lại.'
        : ''

  return <div className="detail-hero panel">
    <h2>{symbol} {name}</h2>
    <strong>{price}</strong>
    <p>{quote
      ? <><span className="chip success">Giá intraday</span> Cập nhật: {quote.fetchedAt} ({quote.upstream}) {licenseUrl && <a className="source-link" href={licenseUrl} target="_blank" rel="noopener noreferrer">Giấy phép dữ liệu</a>}</>
      : <>Giá đóng cửa EOD Cập nhật: {eodFetchedAt}</>}</p>
    {statusMessage && <p className="data-time">{statusMessage}</p>}
    <div className="detail-actions">
      <button className="ghost-btn detail-analysis-btn" type="button" onClick={onRequestAnalysis}>{analysis.status === 'loading' ? 'Đang phân tích...' : analysis.data ? 'Cập nhật phân tích' : 'Phân tích chuyên sâu'}</button>
      <button className="primary-btn detail-add-btn" type="button" onClick={onAddToPortfolio}>Thêm vào danh mục</button>
    </div>
    {analysis.data?.expert_guidance && <div className="detail-analysis-ready"><strong>Phân tích nâng cao đã sẵn sàng</strong><span>Điểm kỹ thuật {analysis.data.expert_guidance.technical_score ?? '-'} /100 · {analysis.data.expert_guidance.stance}</span></div>}
  </div>
}
