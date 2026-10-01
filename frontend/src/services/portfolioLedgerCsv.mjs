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

function parseCsvRecords(text) {
  const records = []
  let record = []
  let field = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { field += '"'; index += 1 }
      else if (char === '"') quoted = false
      else field += char
    } else if (char === '"' && field === '') quoted = true
    else if (char === ',') { record.push(field); field = '' }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1
      record.push(field); field = ''
      records.push(record); record = []
    } else field += char
  }
  if (quoted) throw new Error('File CSV có ô chưa đóng dấu ngoặc kép')
  if (field !== '' || record.length) { record.push(field); records.push(record) }
  return records.filter(row => row.some(cell => cell.trim() !== ''))
}

const normalizeHeader = value => String(value || '').replace(/^\uFEFF/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replaceAll('đ', 'd').replaceAll('Đ', 'D').toLowerCase().replace(/[^a-z0-9]/g, '')
const HEADER_ALIASES = {
  symbol: ['ma', 'symbol'],
  side: ['loai', 'side'],
  quantity: ['soluong', 'quantity'],
  price: ['gia', 'giavndcophieu', 'price'],
  fees: ['phi', 'phivnd', 'fees', 'fee'],
  traded_at: ['thoidiemgiaodich', 'tradedat', 'date', 'datetime']
}

export function parsePortfolioLedgerCsv(text) {
  const records = parseCsvRecords(String(text || ''))
  if (records.length < 2) throw new Error('File CSV phải có hàng tiêu đề và ít nhất một giao dịch')
  const headers = records[0].map(normalizeHeader)
  const indexes = {}
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) indexes[field] = headers.findIndex(header => aliases.includes(header))
  const missing = ['symbol', 'side', 'quantity', 'price', 'traded_at'].filter(field => indexes[field] < 0)
  if (missing.length) throw new Error('Thiếu cột bắt buộc: Mã, Loại, Số lượng, Giá hoặc Thời điểm giao dịch')
  const rows = records.slice(1).map((record, index) => {
    const side = normalizeHeader(record[indexes.side])
    return {
      row_number: index + 2,
      symbol: record[indexes.symbol]?.trim() || '',
      side: side === 'mua' || side === 'buy' ? 'BUY' : side === 'ban' || side === 'sell' ? 'SELL' : record[indexes.side]?.trim() || '',
      quantity: record[indexes.quantity]?.trim() || '',
      price: record[indexes.price]?.trim() || '',
      fees: indexes.fees >= 0 ? record[indexes.fees]?.trim() || '0' : '0',
      traded_at: record[indexes.traded_at]?.trim() || ''
    }
  })
  if (rows.length > 500) throw new Error('Mỗi lần chỉ được nhập tối đa 500 giao dịch')
  return rows
}
