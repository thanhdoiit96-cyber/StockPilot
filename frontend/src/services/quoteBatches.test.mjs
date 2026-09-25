import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeSettledQuotes, splitQuoteSymbols } from './quoteBatches.mjs'

test('splits a 500-symbol universe into bounded unique batches', () => {
  const symbols = Array.from({ length: 500 }, (_, index) => `s${index}`)
  const batches = splitQuoteSymbols([...symbols, 'S1', '', null], 100)
  assert.equal(batches.length, 5)
  assert.deepEqual(batches.map(batch => batch.length), [100, 100, 100, 100, 100])
  assert.equal(new Set(batches.flat()).size, 500)
  assert.equal(batches[0][0], 'S0')
})

test('keeps successful quote batches when another batch fails', () => {
  const merged = mergeSettledQuotes([
    { status: 'fulfilled', value: { data: { FPT: { price: 100 } } } },
    { status: 'rejected', reason: new Error('provider timeout') },
    { status: 'fulfilled', value: { data: { SSI: { price: 30 } } } }
  ], payload => payload.data)
  assert.deepEqual(merged, { FPT: { price: 100 }, SSI: { price: 30 } })
})
