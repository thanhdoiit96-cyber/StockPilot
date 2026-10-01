import test from 'node:test'
import assert from 'node:assert/strict'
import { csvCell, parsePortfolioLedgerCsv, serializePortfolioLedger } from './portfolioLedgerCsv.mjs'

test('escapes quotes and formula-like ledger cells', () => {
  assert.equal(csvCell('ACME "A"'), '"ACME ""A"""')
  assert.equal(csvCell('=2+2'), '"\'=2+2"')
  assert.equal(csvCell('+cmd'), '"\'+cmd"')
  assert.equal(csvCell('-1'), '"\'-1"')
  assert.equal(csvCell('@sum'), '"\'@sum"')
})

test('serializes a UTF-8 ledger with normalized labels and ISO time', () => {
  const csv = serializePortfolioLedger([{ symbol: 'FPT', name: 'FPT Corp', side: 'BUY', quantity: 10, price: 120000, fees: 1500, traded_at: '2026-10-01T03:00:00Z', source: 'recommendation' }])
  assert.ok(csv.startsWith('\uFEFF"Mã"'))
  assert.match(csv, /"FPT","FPT Corp","Mua","10","120000","1500","2026-10-01T03:00:00.000Z","Đề xuất"/)
})

test('keeps malformed optional dates empty instead of breaking export', () => {
  const csv = serializePortfolioLedger([{ symbol: 'VCB', side: 'SELL', traded_at: 'not-a-date', source: 'manual' }])
  assert.match(csv, /"VCB","","Bán","","","","","Thủ công"/)
})

test('parses the exported Vietnamese headers and BUY/SELL labels', () => {
  const rows = parsePortfolioLedgerCsv('\uFEFF"Mã","Tên","Loại","Số lượng","Giá (VND/cổ phiếu)","Phí (VND)","Thời điểm giao dịch","Nguồn"\r\n"FPT","FPT, Corp","Mua","10","120000","1500","2026-10-01T03:00:00.000Z","Thủ công"\r\n"VCB","VCB","Bán","2","65000","","2026-10-02T03:00:00.000Z","Thủ công"')
  assert.deepEqual(rows, [
    { row_number: 2, symbol: 'FPT', side: 'BUY', quantity: '10', price: '120000', fees: '1500', traded_at: '2026-10-01T03:00:00.000Z' },
    { row_number: 3, symbol: 'VCB', side: 'SELL', quantity: '2', price: '65000', fees: '0', traded_at: '2026-10-02T03:00:00.000Z' }
  ])
})

test('rejects an incomplete CSV contract before sending it to the API', () => {
  assert.throws(() => parsePortfolioLedgerCsv('Mã,Giá\nFPT,120000'), /Thiếu cột bắt buộc/)
  assert.throws(() => parsePortfolioLedgerCsv('"Mã,Loại\nFPT,Mua'), /chưa đóng/)
})
