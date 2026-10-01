const HEADERS = ['Mã', 'Tên', 'Loại', 'Số lượng', 'Giá (VND/cổ phiếu)', 'Phí (VND)', 'Thời điểm giao dịch', 'Nguồn']

export function csvCell(value) {
  let text = String(value ?? '')
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

const isoDate = value => {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : ''
}

export function serializePortfolioLedger(entries = []) {
  const rows = entries.map(entry => [
    entry.symbol,
    entry.name,
    entry.side === 'BUY' ? 'Mua' : 'Bán',
    entry.quantity,
    entry.price,
    entry.fees,
    isoDate(entry.traded_at),
    entry.source === 'recommendation' ? 'Đề xuất' : 'Thủ công'
  ])
  return `\uFEFF${[HEADERS, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n')}`
}
