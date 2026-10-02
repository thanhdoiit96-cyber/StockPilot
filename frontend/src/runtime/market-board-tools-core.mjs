export const MARKET_COLUMNS_KEY = 'stockpilot-market-columns-v1'

export const MARKET_COLUMN_DEFINITIONS = [
  { key: 'name', label: 'Doanh nghiệp', index: 1 },
  { key: 'volume', label: 'Khối lượng', index: 4 },
  { key: 'analysis', label: 'Phân tích', index: 6 },
  { key: 'actions', label: 'Thao tác', index: 7 }
]

export const MARKET_COLUMN_PRESETS = [
  { key: 'full', label: 'Đầy đủ', columns: { name: true, volume: true, analysis: true, actions: true } },
  { key: 'watch', label: 'Theo dõi', columns: { name: true, volume: true, analysis: false, actions: false } },
  { key: 'analysis', label: 'Phân tích', columns: { name: true, volume: true, analysis: true, actions: false } },
  { key: 'trading', label: 'Giao dịch', columns: { name: false, volume: true, analysis: false, actions: true } }
]

export const normalizeMarketColumns = (saved = {}) => Object.fromEntries(
  MARKET_COLUMN_DEFINITIONS.map(column => [column.key, saved?.[column.key] !== false])
)

export const marketColumnPresetKey = columns => {
  const normalized = normalizeMarketColumns(columns)
  return MARKET_COLUMN_PRESETS.find(preset => MARKET_COLUMN_DEFINITIONS.every(column => preset.columns[column.key] === normalized[column.key]))?.key || 'custom'
}

export const csvCell = value => {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim()
  const safe = /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized
  return `"${safe.replaceAll('"', '""')}"`
}

export const serializeMarketBoardCsv = ({ headers = [], rows = [], columns = normalizeMarketColumns() }) => {
  const exportIndexes = [0, 1, 2, 3, 4].filter(index => {
    const definition = MARKET_COLUMN_DEFINITIONS.find(column => column.index === index)
    return !definition || columns[definition.key] !== false
  })
  const records = [
    exportIndexes.map(index => csvCell(headers[index] || '')).join(','),
    ...rows.map(row => exportIndexes.map(index => csvCell(row[index] || '')).join(','))
  ]
  return `\uFEFF${records.join('\r\n')}\r\n`
}
