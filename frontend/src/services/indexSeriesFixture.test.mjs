import test from 'node:test'
import assert from 'node:assert/strict'
import { INDEX_SERIES_FIXTURE, indexSeriesFixtureLabel } from './indexSeriesFixture.mjs'

test('fixture index series is explicitly labeled and bounded to development data', () => {
  assert.equal(INDEX_SERIES_FIXTURE.provider, 'fixture')
  assert.equal(INDEX_SERIES_FIXTURE.return_type, 'price_return')
  assert.equal(indexSeriesFixtureLabel(INDEX_SERIES_FIXTURE), 'Dữ liệu mô phỏng (development)')
  assert.equal(INDEX_SERIES_FIXTURE.points.length, 4)
})
