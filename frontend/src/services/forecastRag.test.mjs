import assert from 'node:assert/strict'
import test from 'node:test'
import { forecastRagTone } from './forecastRag.mjs'

test('forecastRagTone grades broad advance probability from low to high', () => {
  assert.equal(forecastRagTone('advance', 39.9), 'red')
  assert.equal(forecastRagTone('advance', 40), 'amber')
  assert.equal(forecastRagTone('advance', 59.9), 'amber')
  assert.equal(forecastRagTone('advance', 60), 'green')
})

test('forecastRagTone inverses decline risk and keeps balanced probability neutral', () => {
  assert.equal(forecastRagTone('decline', 19.9), 'green')
  assert.equal(forecastRagTone('decline', 20), 'amber')
  assert.equal(forecastRagTone('decline', 40), 'red')
  assert.equal(forecastRagTone('balanced', 90), 'amber')
})

test('forecastRagTone bounds malformed values before choosing a tone', () => {
  assert.equal(forecastRagTone('advance', 'not-a-number'), 'red')
  assert.equal(forecastRagTone('decline', -5), 'green')
  assert.equal(forecastRagTone('advance', 150), 'green')
})
