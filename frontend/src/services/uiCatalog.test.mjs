import { test } from 'node:test'
import assert from 'node:assert/strict'
import { uiCatalogs, uiText } from './uiCatalog.mjs'

test('full UI catalog keeps exact Vietnamese/English key parity', () => {
  assert.deepEqual(Object.keys(uiCatalogs.vi).sort(), Object.keys(uiCatalogs.en).sort())
})

test('full UI catalog translates shared account and market copy with safe fallback', () => {
  assert.equal(uiText('en', 'Đăng xuất'), 'Sign out')
  assert.equal(uiText('en', 'Tìm cổ phiếu'), 'Search stocks')
  assert.equal(uiText('en', 'provider-owned narrative'), 'provider-owned narrative')
})
