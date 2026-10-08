import test from 'node:test'
import assert from 'node:assert/strict'
import { validateMarketIndexSeries } from './marketIndexSeriesContract.mjs'

const validSeries = () => ({
  symbol: 'VNINDEX', provider: 'licensed-provider', license: 'display-approved-2026', source_url: 'https://provider.example.vn/index/VNINDEX',
  session_timezone: 'Asia/Ho_Chi_Minh', return_type: 'price_return', observed_at: '2026-10-08T14:45:00+07:00', stale_after_seconds: 300,
  previous_close: { session_date: '2026-10-07', close: 1275 },
  points: [{ session_date: '2026-10-06', close: 1260 }, { session_date: '2026-10-07', close: 1275 }],
  intraday_points: [{ observed_at: '2026-10-08T09:15:00+07:00', close: 1272 }, { observed_at: '2026-10-08T14:45:00+07:00', close: 1280 }],
})

test('accepts a licensed, ordered index series with explicit freshness semantics', () => {
  assert.deepEqual(validateMarketIndexSeries(validSeries()), { valid: true, reasons: [] })
})

test('rejects development fixtures and incomplete provider provenance', () => {
  const series = validSeries()
  series.provider = 'fixture'
  delete series.license
  series.source_url = 'http://example.com'
  assert.deepEqual(validateMarketIndexSeries(series), { valid: false, reasons: ['unapproved_provider', 'missing_license', 'invalid_source_url'] })
})

test('rejects duplicate daily dates and unordered intraday observations instead of repairing them', () => {
  const series = validSeries()
  series.points[1].session_date = series.points[0].session_date
  series.intraday_points.reverse()
  assert.deepEqual(validateMarketIndexSeries(series), { valid: false, reasons: ['invalid_daily_points', 'invalid_intraday_points'] })
})
