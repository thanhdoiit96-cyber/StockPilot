import test from 'node:test'
import assert from 'node:assert/strict'
import { csvCell, serializePortfolioLedger } from './portfolioLedgerCsv.mjs'

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
