import test from 'node:test'
import assert from 'node:assert/strict'
import { formatDateOnly, formatDateTime, formatMoney, localeFor, timezoneFor } from './userLocale.mjs'

test('normalizes supported language and timezone preferences', () => {
  assert.equal(localeFor('en'), 'en-US')
  assert.equal(localeFor('unknown'), 'vi-VN')
  assert.equal(timezoneFor('UTC'), 'UTC')
  assert.equal(timezoneFor('Europe/London'), 'Asia/Ho_Chi_Minh')
})
test('formats account locale without shifting a date-only value', () => {
  assert.match(formatMoney(1234567, 'vi'), /1\.234\.567/)
  assert.match(formatMoney(1234567, 'en'), /1,234,567/)
  assert.equal(formatDateOnly('2026-10-07', 'en', { year: 'numeric', month: '2-digit', day: '2-digit' }), '10/07/2026')
  assert.notEqual(formatDateTime('2026-10-07T00:30:00Z', 'vi', 'UTC'), formatDateTime('2026-10-07T00:30:00Z', 'vi', 'Asia/Ho_Chi_Minh'))
})
