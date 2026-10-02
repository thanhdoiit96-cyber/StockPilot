import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAdvisorEvidence } from './advisorEvidence.mjs'

test('builds symbol evidence with safe citations only', () => {
  const result = buildAdvisorEvidence({ context: 'symbol', selectedStock: { symbol: 'FPT', sourceUrl: 'https://example.com/company' }, analysis: { insight: { label: 'Xu hướng tích cực' }, external_factors: [{ title: 'Tin tức', source_url: 'javascript:alert(1)' }] }, quotes: { FPT: { license_url: 'https://example.com/license' } } })
  assert.match(result.answer, /FPT: Xu hướng tích cực/)
  assert.equal(result.citations[0].url, 'https://example.com/company')
  assert.equal(result.citations[1].url, 'https://example.com/license')
  assert.equal(result.citations[2].url, null)
})

test('summarizes only the selected context', () => {
  const portfolio = buildAdvisorEvidence({ context: 'portfolio', positions: [{ total_pnl: 1200 }, { unrealized_pnl: -200 }] })
  assert.match(portfolio.answer, /2 vị thế đang mở/)
  assert.match(portfolio.answer, /1\.000 ₫/)
  const market = buildAdvisorEvidence({ context: 'market', marketStocks: [{}, {}, {}], quotes: { FPT: { price: 1 }, VCB: { price: null } } })
  assert.match(market.answer, /3 mã/)
  assert.match(market.answer, /1 mã có quote Intraday/)
})
