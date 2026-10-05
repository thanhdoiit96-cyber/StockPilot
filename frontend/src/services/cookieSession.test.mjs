import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readCsrfCookie, resetRefreshForTests, sessionFetch } from './cookieSession.mjs'

const originalFetch = globalThis.fetch
const originalDocument = globalThis.document
afterEach(() => { globalThis.fetch = originalFetch; globalThis.document = originalDocument; resetRefreshForTests() })

test('reads the csrf cookie and sends cookie auth without an authorization header', async () => {
  globalThis.document = { cookie: 'other=x; sp_csrf=csrf%20token' }
  let request
  globalThis.fetch = async (url, init) => { request = { url, init }; return new Response(JSON.stringify({ success: true }), { status: 200 }) }
  assert.equal(readCsrfCookie(), 'csrf token')
  await sessionFetch('/api/portfolio', { method: 'POST', token: true, body: '{}' })
  assert.equal(request.init.credentials, 'same-origin')
  assert.equal(request.init.headers.get('Authorization'), null)
  assert.equal(request.init.headers.get('X-CSRF-Token'), 'csrf token')
})

test('opts login into cookie mode and refreshes one time before retrying a protected read', async () => {
  globalThis.document = { cookie: 'sp_csrf=csrf' }
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    if (url === '/api/auth/login') return new Response('{}', { status: 200 })
    if (url === '/api/auth/refresh') return new Response('{}', { status: 200 })
    return new Response('{}', { status: calls.filter(call => call.url === '/api/portfolio').length === 1 ? 401 : 200 })
  }
  const login = await sessionFetch('/api/auth/login', { method: 'POST', body: '{}' })
  assert.equal(login.status, 200)
  assert.equal(calls[0].init.headers.get('X-Auth-Mode'), 'cookie-v1')
  const response = await sessionFetch('/api/portfolio', { token: true })
  assert.equal(response.status, 200)
  assert.deepEqual(calls.map(call => call.url), ['/api/auth/login', '/api/portfolio', '/api/auth/refresh', '/api/portfolio'])
})

test('keeps legacy bearer compatibility only for string credentials', async () => {
  let headers
  globalThis.document = { cookie: '' }
  globalThis.fetch = async (_url, init) => { headers = init.headers; return new Response('{}', { status: 200 }) }
  await sessionFetch('/api/auth/me', { token: 'legacy-token' })
  assert.equal(headers.get('Authorization'), 'Bearer legacy-token')
})
