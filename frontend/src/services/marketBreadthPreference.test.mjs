import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeMarketBreadthScope, parseMarketBreadthStorageValue, readMarketBreadthScope } from './marketBreadthPreference.mjs'

test('normalizes a valid market breadth scope', () => {
  assert.deepEqual(normalizeMarketBreadthScope({ exchange: ' hsx ', sector: 'technology' }), { exchange: 'HSX', sector: 'technology' })
})

test('rejects malformed or unknown market breadth scopes', () => {
  assert.equal(normalizeMarketBreadthScope({ exchange: 'NYSE', sector: '' }), null)
  assert.equal(normalizeMarketBreadthScope({ exchange: '', sector: 'unknown' }), null)
  assert.equal(parseMarketBreadthStorageValue('{broken'), null)
})

test('reads defaults for absent and invalid storage values', () => {
  assert.deepEqual(readMarketBreadthScope({ getItem: () => null }), { exchange: '', sector: '' })
  assert.deepEqual(readMarketBreadthScope({ getItem: () => '{broken' }), { exchange: '', sector: '' })
})
