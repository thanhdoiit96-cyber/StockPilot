import assert from 'node:assert/strict'
import test from 'node:test'
import { forecastOutcomeTone, roundedForecastPercent } from './forecastDisplay.mjs'

test('rounds valid forecast probabilities to one decimal place', () => {
  assert.equal(roundedForecastPercent(.352261), 35.2)
  assert.equal(roundedForecastPercent(.995), 99.5)
  assert.equal(roundedForecastPercent(null), null)
  assert.equal(roundedForecastPercent('invalid'), null)
})

test('keeps outcome colours semantic instead of confidence-dependent', () => {
  assert.equal(forecastOutcomeTone('advancing'), 'advance')
  assert.equal(forecastOutcomeTone('balanced'), 'balanced')
  assert.equal(forecastOutcomeTone('declining'), 'decline')
  assert.equal(forecastOutcomeTone('unknown'), null)
})
