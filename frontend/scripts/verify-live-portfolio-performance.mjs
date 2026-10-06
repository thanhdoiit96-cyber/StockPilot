import { randomUUID } from 'node:crypto'

const origin = 'http://127.0.0.1:4173'

function createClient() {
  const cookies = new Map()
  const request = async (path, { method = 'GET', body, headers = {} } = {}) => {
    const response = await fetch(origin + path, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(cookies.size ? { Cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; ') } : {}),
        ...headers
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
    for (const raw of response.headers.getSetCookie()) {
      const [pair] = raw.split(';'); const separator = pair.indexOf('=')
      const name = pair.slice(0, separator); const value = pair.slice(separator + 1)
      if (value) cookies.set(name, value); else cookies.delete(name)
    }
    let payload = null
    try { payload = await response.json() } catch {}
    return { status: response.status, payload }
  }
  return { request, csrf: () => decodeURIComponent(cookies.get('sp_csrf') || '') }
}

async function registerClient(label) {
  const client = createClient()
  const response = await client.request('/api/auth/register', {
    method: 'POST', headers: { 'X-Auth-Mode': 'cookie-v1' },
    body: { email: `performance-${label}-${randomUUID()}@example.invalid`, password: randomUUID() }
  })
  if (response.status !== 201) throw new Error(`Development registration failed: HTTP ${response.status}`)
  if (!client.csrf()) throw new Error('CSRF cookie missing after cookie registration')
  return client
}

const owner = await registerClient('owner')
const other = await registerClient('other')
const mutationHeaders = { 'X-CSRF-Token': owner.csrf() }
const created = await owner.request('/api/portfolio/cash-flows', {
  method: 'POST', headers: mutationHeaders,
  body: { type: 'DEPOSIT', amount: 1000000, occurred_at: '2026-01-02T03:00:00.000Z', note: 'Daily valuation smoke' }
})
if (created.status !== 201) throw new Error(`Cash-flow setup failed: HTTP ${created.status}`)
const flow = created.payload.data
const historyResponse = await owner.request('/api/portfolio/performance/history?sessions=5')
if (historyResponse.status !== 200) throw new Error(`Performance history failed: HTTP ${historyResponse.status}`)
const history = historyResponse.payload.data
if (history.methodology !== 'daily_close_twr_v1' || history.timezone !== 'Asia/Ho_Chi_Minh' || history.cash_flow_timing !== 'beginning_of_session') throw new Error('Daily valuation contract metadata mismatch')
if (history.coverage.sessions < 2 || history.coverage.complete_sessions !== history.coverage.sessions) throw new Error('Development EOD sessions are insufficient or incomplete')
if (!history.twr_available || history.cumulative_twr_pct !== 0) throw new Error('Cash-only portfolio should publish zero TWR across complete sessions')
if (history.mwr?.status !== 'available' || history.mwr.annualized_mwr_pct !== 0 || Math.abs(history.mwr.npv_residual) > 0.01 || history.mwr.scope !== 'inception_to_terminal') throw new Error('Cash-only portfolio should publish independently verifiable zero MWR/XIRR')
if (history.points.some(point => point.portfolio_value !== 1000000 || point.cash_balance !== 1000000 || point.status !== 'complete')) throw new Error('Cash-only daily valuation is inconsistent')

const isolated = (await other.request('/api/portfolio/performance/history?sessions=5')).payload.data
if (isolated.points.some(point => point.portfolio_value !== 0 || point.cash_balance !== 0)) throw new Error('Cash-flow data leaked across portfolio owners')

const removed = await owner.request(`/api/portfolio/cash-flows/${encodeURIComponent(flow.id)}`, { method: 'DELETE', headers: mutationHeaders, body: { confirmed: true } })
if (removed.status !== 200) throw new Error(`Cash-flow cleanup failed: HTTP ${removed.status}`)
const after = (await owner.request('/api/portfolio/performance/history?sessions=5')).payload.data
if (after.points.some(point => point.portfolio_value !== 0 || point.cash_balance !== 0)) throw new Error('Daily valuation did not refresh after cash-flow deletion')
if (after.mwr?.status !== 'unavailable' || after.mwr.reason !== 'insufficient_sign_change') throw new Error('MWR should be withheld after its external cash-flow basis is removed')
console.log(`Real development daily valuation passed: ${history.coverage.sessions} sessions, complete coverage, zero cash-only TWR/MWR, ownership isolation and cleanup. Two isolated smoke accounts retained; no credentials persisted.`)
