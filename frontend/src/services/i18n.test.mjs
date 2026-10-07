import test from 'node:test'
import assert from 'node:assert/strict'
import { catalogs, translate } from './i18n.mjs'
import { detailCatalogs, translateDetail } from './detailCatalog.mjs'

test('Vietnamese and English catalogs have exact key parity', () => {
  assert.deepEqual(Object.keys(catalogs.en).sort(), Object.keys(catalogs.vi).sort())
  assert.deepEqual(Object.keys(detailCatalogs.en).sort(), Object.keys(detailCatalogs.vi).sort())
  assert.equal(translateDetail('en', 'Khối lượng theo phiên'), 'Volume by session')
  assert.equal(translateDetail('en', 'FPT'), 'FPT')
})
test('translation falls back safely to Vietnamese and then the key', () => {
  assert.equal(translate('en', 'auth.login'), 'Sign in')
  assert.equal(translate('unknown', 'auth.login'), 'Đăng nhập')
  assert.equal(translate('en', 'missing.key'), 'missing.key')
})
test('translation interpolates catalog variables without evaluating user values', () => {
  assert.equal(translate('en', 'portfolio.watchlist.added', { code: 'FPT' }), 'Added FPT to Watchlist.')
  assert.equal(translate('vi', 'portfolio.history.cashDeficit', { count: 2 }), 'Có 2 phiên giao dịch làm số dư tiền âm. Hãy ghi nhận khoản nạp vốn trước hoặc cùng ngày mua.')
})
