import test from 'node:test'
import assert from 'node:assert/strict'
import { MARKET_COLUMN_PRESETS, csvCell, marketColumnPresetKey, normalizeMarketColumns, serializeMarketBoardCsv } from './market-board-tools-core.mjs'

test('normalizes missing and invalid column preferences to visible defaults', () => {
  assert.deepEqual(normalizeMarketColumns(), { name: true, volume: true, analysis: true, actions: true })
  assert.deepEqual(normalizeMarketColumns({ name: false, volume: 'false' }), { name: false, volume: true, analysis: true, actions: true })
})

test('recognizes task presets while preserving unmatched custom columns', () => {
  for (const preset of MARKET_COLUMN_PRESETS) assert.equal(marketColumnPresetKey(preset.columns), preset.key)
  assert.equal(marketColumnPresetKey({ name: false, volume: false, analysis: true, actions: false }), 'custom')
})

test('escapes quotes and formula-like cells in CSV output', () => {
  assert.equal(csvCell('Công ty "A"'), '"Công ty ""A"""')
  assert.equal(csvCell('=HYPERLINK("https://example.test")'), '"\'=HYPERLINK(""https://example.test"")"')
})

test('serializes only enabled data columns and excludes action columns', () => {
  const content = serializeMarketBoardCsv({
    headers: ['Mã', 'Doanh nghiệp', 'Giá', 'Thay đổi', 'Khối lượng', 'Nguồn', 'Phân tích', 'Thao tác'],
    rows: [['FPT', 'FPT Corporation', '100.000 ₫', '+1,20%', '1,2 Tr', 'VCI', 'Phân tích chuyên sâu', 'Thêm']],
    columns: normalizeMarketColumns({ name: false })
  })
  assert.match(content, /^\uFEFF"Mã","Giá","Thay đổi","Khối lượng"/)
  assert.match(content, /"FPT","100\.000 ₫","'\+1,20%","1,2 Tr"/)
  assert.doesNotMatch(content, /FPT Corporation|Phân tích chuyên sâu|Thêm/)
})
