import { randomUUID } from 'node:crypto'
const origin = 'http://127.0.0.1:4173'
const cookies = new Map()
async function request(path, { method = 'GET', body } = {}) {
  const csrf = decodeURIComponent(cookies.get('sp_csrf') || '')
  const response = await fetch(origin + path, { method, headers: { 'X-Auth-Mode': 'cookie-v1', ...(body === undefined ? {} : { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }), ...(cookies.size ? { Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; ') } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
  for (const raw of response.headers.getSetCookie()) { const [pair] = raw.split(';'); const at = pair.indexOf('='); const name = pair.slice(0, at); const value = pair.slice(at + 1); if (value) cookies.set(name, value); else cookies.delete(name) }
  let payload = null; try { payload = await response.json() } catch {}
  return { status: response.status, payload }
}
const registered = await request('/api/auth/register', { method: 'POST', body: { email: `dividend-${randomUUID()}@example.invalid`, password: randomUUID() } })
if (registered.status !== 201) throw new Error(`Registration failed: HTTP ${registered.status}`)
const cashFlow = await request('/api/portfolio/cash-flows', { method: 'POST', body: { type: 'DEPOSIT', amount: 1000000, occurred_at: '2026-01-02T03:00:00.000Z', note: 'Dividend valuation smoke' } })
if (cashFlow.status !== 201) throw new Error(`Deposit failed: HTTP ${cashFlow.status}`)
const baseline = (await request('/api/portfolio/performance/history?sessions=5')).payload.data
if (baseline.points.length < 3) throw new Error('At least three stored sessions are required')
const [recordDate, paymentDate] = baseline.points.map(point => point.date)
const transaction = await request('/api/portfolio/transactions', { method: 'POST', body: { symbol: 'FPT', side: 'BUY', quantity: 1, price: 10000, fees: 0, traded_at: `${recordDate}T01:00:00+07:00` } })
if (transaction.status !== 201) throw new Error(`Transaction failed: HTTP ${transaction.status}`)
const transactionId = transaction.payload.data.id
const event = await request('/api/portfolio/events', { method: 'POST', body: { event_type: 'CASH_DIVIDEND', symbol: 'FPT', record_date: recordDate, payment_date: paymentDate, entitlement_quantity: 1, payload: { gross_per_share: 1000, withholding_tax: 0, net_cash_amount: 1000, currency: 'VND' } } })
if (event.status !== 201 || event.payload.data.reconciliation?.status !== 'matched') throw new Error(`Dividend event setup failed: HTTP ${event.status}`)
const pendingHistory = (await request('/api/portfolio/performance/history?sessions=5')).payload.data
if (pendingHistory.twr_available || pendingHistory.event_coverage.pending_events !== 1 || !pendingHistory.limitations.includes('pending_portfolio_events')) throw new Error('Pending dividend did not block TWR/coverage')
const confirmed = await request(`/api/portfolio/events/${event.payload.data.id}/confirm`, { method: 'POST', body: { confirmed: true } })
if (confirmed.status !== 200) throw new Error(`Dividend confirmation failed: HTTP ${confirmed.status}`)
const applied = (await request('/api/portfolio/performance/history?sessions=5')).payload.data
const paymentPoint = applied.points.find(point => point.date === paymentDate)
if (applied.event_coverage.applied_events !== 1 || paymentPoint?.dividend_income !== 1000 || paymentPoint?.external_cash_flow !== 0) throw new Error('Confirmed dividend was not applied as investment return')
await request(`/api/portfolio/events/${event.payload.data.id}/cancel`, { method: 'POST', body: { confirmed: true } })
const split = await request('/api/portfolio/events', { method: 'POST', body: { event_type: 'STOCK_SPLIT', symbol: 'FPT', record_date: recordDate, effective_date: paymentDate, entitlement_quantity: 1, payload: { ratio_numerator: 1, ratio_denominator: 1 } } })
if (split.status !== 201 || split.payload.data.reconciliation?.status !== 'matched') throw new Error(`Split event setup failed: HTTP ${split.status}`)
if ((await request(`/api/portfolio/events/${split.payload.data.id}/confirm`, { method: 'POST', body: { confirmed: true } })).status !== 200) throw new Error('Split confirmation failed')
const splitHistory = (await request('/api/portfolio/performance/history?sessions=5')).payload.data
const splitPoint = splitHistory.points.find(point => point.date === paymentDate)
const adjustment = splitPoint?.stock_event_adjustments?.find(item => item.event_id === split.payload.data.id)
if (splitHistory.status !== 'complete' || !adjustment || adjustment.quantity_before !== 1 || adjustment.quantity_after !== 1 || adjustment.cost_basis_before !== 10000 || adjustment.cost_basis_after !== 10000) throw new Error('Confirmed split did not preserve live quantity/cost-basis continuity')
await request(`/api/portfolio/events/${split.payload.data.id}/cancel`, { method: 'POST', body: { confirmed: true } })
await request(`/api/portfolio/transactions/${transactionId}`, { method: 'DELETE', body: { confirmed: true } })
await request(`/api/portfolio/cash-flows/${cashFlow.payload.data.id}`, { method: 'DELETE', body: { confirmed: true } })
console.log('Real development event valuation passed: pending coverage gate, confirmed cash dividend, stock-split quantity/cost continuity and cleanup. Isolated smoke account retained; no credentials persisted.')
