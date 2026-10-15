import test from 'node:test'
import assert from 'node:assert/strict'
import { buildMarketBasket } from './marketBasket.mjs'

test('buildMarketBasket derives a compact, ranked basket from market rows', () => {
  const basket = buildMarketBasket([
    { symbol: 'VCB', change: 1.8, volume: 1200000 },
    { symbol: 'FPT', change: -0.9, volume: 900000 },
    { symbol: 'VHM', change: 1.2, volume: 1800000 },
    { symbol: 'HPG', change: -1.2, volume: 700000 },
    { symbol: 'MWG', change: 0.5, volume: 1300000 },
    { symbol: 'PDR', change: -1.8, volume: 600000 },
    { symbol: 'SSI', change: 0.3, volume: 500000 }
  ], { limit: 6 })

  assert.equal(basket.items.length, 6)
  assert.equal(basket.items[0].symbol, 'VCB')
  assert.equal(basket.summary.leaders, 3)
  assert.equal(basket.summary.laggards, 2)
  assert.equal(basket.summary.neutral, 1)
  assert.ok(basket.items.every(item => Number.isFinite(item.change_pct)))
})
