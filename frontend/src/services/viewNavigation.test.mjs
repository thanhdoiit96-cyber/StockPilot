import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeAppView, readAppView, writeAppView } from './viewNavigation.mjs'

test('accepts only known application views', () => {
  assert.equal(normalizeAppView('portfolio'), 'portfolio')
  assert.equal(normalizeAppView('unknown'), 'overview')
  assert.equal(normalizeAppView(null), 'overview')
})

test('reads a shareable view while keeping a stock link authoritative', () => {
  assert.equal(readAppView({ search: '?view=recommendations' }, 'overview'), 'recommendations')
  assert.equal(readAppView({ search: '?view=advisor&stock=42' }, 'overview'), 'detail')
  assert.equal(readAppView({ search: '?view=unsafe' }, 'portfolio'), 'overview')
  assert.equal(readAppView({ search: '' }, 'portfolio'), 'portfolio')
})

test('writes a canonical URL without discarding unrelated parameters', () => {
  const market = writeAppView({ href: 'http://localhost:4173/?campaign=demo&stock=7' }, 'market-board')
  assert.equal(market.searchParams.get('view'), 'market-board')
  assert.equal(market.searchParams.get('campaign'), 'demo')
  assert.equal(market.searchParams.has('stock'), false)

  const detail = writeAppView({ href: market.href }, 'detail', 'abc')
  assert.equal(detail.searchParams.get('view'), 'detail')
  assert.equal(detail.searchParams.get('stock'), 'abc')

  const overview = writeAppView({ href: detail.href }, 'overview')
  assert.equal(overview.searchParams.has('view'), false)
  assert.equal(overview.searchParams.has('stock'), false)
})
