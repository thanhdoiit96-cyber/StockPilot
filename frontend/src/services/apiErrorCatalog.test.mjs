import { test } from 'node:test'
import assert from 'node:assert/strict'
import { apiErrorCatalog, localizeApiError } from './apiErrorCatalog.mjs'

test('error catalog keeps parity for every supported code', () => {
  assert.deepEqual(Object.keys(apiErrorCatalog('vi')).sort(), Object.keys(apiErrorCatalog('en')).sort())
})

test('known codes localize and unknown codes fall back to server message', () => {
  assert.equal(localizeApiError({ code: 'market_stock_not_found', message: 'Stock not found' }, 'en'), 'Stock symbol not found.')
  assert.equal(localizeApiError({ code: 'unknown_code', message: 'Provider detail' }, 'vi'), 'Provider detail')
})
