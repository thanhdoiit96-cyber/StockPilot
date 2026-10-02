const safeUrl = value => {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch { return null }
}

export function buildAdvisorEvidence({ context, selectedStock, analysis, positions = [], marketStocks = [], quotes = {}, providerLicenseUrl }) {
  if (context === 'portfolio') {
    const pnl = positions.reduce((sum, item) => sum + Number(item.total_pnl ?? item.unrealized_pnl ?? 0), 0)
    return {
      answer: `Danh mục hiện có ${positions.length} vị thế đang mở; tổng P/L khả dụng ${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(pnl)} ₫. Cần xem từng tỷ trọng và giá vốn trước khi ra quyết định.`,
      citations: [{ label: 'Danh mục cá nhân · ledger đã xác thực', url: null }]
    }
  }
  if (context === 'market') {
    const quoteCount = Object.values(quotes).filter(item => item?.price != null && Number.isFinite(Number(item.price)) && Number(item.price) > 0).length
    return {
      answer: `Phạm vi hiện tại có ${marketStocks.length} mã, trong đó ${quoteCount} mã có quote Intraday hợp lệ. Các mã còn lại dùng dữ liệu EOD gần nhất khi có.`,
      citations: [{ label: 'VCI · dữ liệu thị trường hiện tại', url: safeUrl(providerLicenseUrl) }]
    }
  }
  const symbol = selectedStock?.symbol || 'Mã đang chọn'
  const insight = analysis?.insight?.label || 'Chưa đủ dữ liệu để tạo nhận định'
  const external = Array.isArray(analysis?.external_factors) ? analysis.external_factors : []
  const citations = [
    { label: `${symbol} · dữ liệu doanh nghiệp`, url: safeUrl(selectedStock?.sourceUrl) },
    { label: 'VCI · dữ liệu giá', url: safeUrl(quotes?.[symbol]?.license_url || providerLicenseUrl) },
    ...external.map((item, index) => ({ label: item.source || item.title || `Nguồn yếu tố bên ngoài ${index + 1}`, url: safeUrl(item.source_url || item.url) }))
  ].filter((item, index, items) => item.label && items.findIndex(candidate => candidate.label === item.label && candidate.url === item.url) === index)
  return { answer: `${symbol}: ${insight}. Đây là phân tích phục vụ nghiên cứu, không phải khuyến nghị mua bán.`, citations }
}
