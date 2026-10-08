import test from 'node:test'
import assert from 'node:assert/strict'
import { filterWatchlist, sortWatchlist, watchlistIndustries } from './watchlistView.mjs'

const entries = [
  { created_at: '2026-10-01T00:00:00Z', status: 'WATCHING', Stock: { code: 'VCB', name: 'Vietcombank', industry: 'Ngân hàng' } },
  { created_at: '2026-10-03T00:00:00Z', metadata_updated_at: '2026-10-04T00:00:00Z', status: 'RESEARCHING', Stock: { code: 'FPT', name: 'FPT', industry: 'Công nghệ' } },
  { created_at: '2026-10-02T00:00:00Z', metadata_updated_at: '2026-10-05T00:00:00Z', status: 'PAUSED', Stock: { code: 'ACB', name: 'Á Châu', industry: 'Ngân hàng' } }
]

test('builds a unique localized industry filter', () => {
  assert.deepEqual(watchlistIndustries(entries), ['Công nghệ', 'Ngân hàng'])
})

test('filters by industry and sorts without mutating source entries', () => {
  assert.deepEqual(sortWatchlist(entries, 'recent').map(item => item.Stock.code), ['FPT', 'ACB', 'VCB'])
  assert.deepEqual(sortWatchlist(entries, 'symbol').map(item => item.Stock.code), ['ACB', 'FPT', 'VCB'])
  assert.deepEqual(sortWatchlist(entries, 'updated').map(item => item.Stock.code), ['ACB', 'FPT', 'VCB'])
  assert.deepEqual(filterWatchlist(entries, 'Ngân hàng').map(item => item.Stock.code), ['VCB', 'ACB'])
  assert.deepEqual(filterWatchlist(entries, '', 'RESEARCHING').map(item => item.Stock.code), ['FPT'])
  assert.equal(entries[0].Stock.code, 'VCB')
})
