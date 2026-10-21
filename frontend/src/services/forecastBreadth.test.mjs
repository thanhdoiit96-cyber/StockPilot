import assert from 'node:assert/strict'
import test from 'node:test'
import { forecastBreadthTarget, isForecastBreadthTarget, summarizeForecastBreadth } from './forecastBreadth.mjs'

test('accepts only the published forward-breadth target contract', () => {
  assert.equal(isForecastBreadthTarget(forecastBreadthTarget), true)
  assert.equal(isForecastBreadthTarget({ ...forecastBreadthTarget, point_estimate_available: true }), false)
})

test('summarizes the most likely classified breadth without inventing a point estimate', () => {
  const summary = summarizeForecastBreadth([{ class: 'advancing', value: .52 }, { class: 'balanced', value: .31 }, { class: 'declining', value: .17 }])
  assert.deepEqual(summary, { scenario: 'advancing', probability: .52, band: forecastBreadthTarget.bands[2] })
  assert.equal(summarizeForecastBreadth([{ class: 'advancing', value: 1 }]), null)
})
