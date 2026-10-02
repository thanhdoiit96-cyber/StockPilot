import test from 'node:test'
import assert from 'node:assert/strict'
import { compareRecommendationSnapshots } from './recommendationSnapshotComparison.mjs'

test('compares snapshot membership, rank, score and criteria without mutating inputs', () => {
  const base = { criteria: { trend: 30, momentum: 20 }, result: { recommendations: [
    { symbol: 'FPT', rank: 1, score: 80 },
    { stock: { code: 'VCB' }, rank: 2, score: 70 }
  ] } }
  const target = { criteria: { trend: 20, momentum: 40 }, result: { recommendations: [
    { symbol: 'VCB', rank: 1, score: 76 },
    { symbol: 'HPG', rank: 2, score: 68 }
  ] } }
  const result = compareRecommendationSnapshots(base, target)
  assert.deepEqual({ added: result.added, removed: result.removed, retained: result.retained }, { added: 1, removed: 1, retained: 1 })
  assert.deepEqual(result.rows.find(row => row.symbol === 'VCB'), {
    symbol: 'VCB', status: 'retained', baseRank: 2, targetRank: 1, rankDelta: 1,
    baseScore: 70, targetScore: 76, scoreDelta: 6
  })
  assert.deepEqual(result.criteria, [
    { key: 'trend', base: 30, target: 20, delta: -10 },
    { key: 'momentum', base: 20, target: 40, delta: 20 }
  ])
  assert.equal(base.result.recommendations[0].rank, 1)
})
