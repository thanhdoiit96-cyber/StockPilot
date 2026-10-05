import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readCsrfCookie, resetRefreshForTests, sessionFetch } from './cookieSession.mjs'

const originalFetch = globalThis.fetch
const originalDocument = globalThis.document

test('session pagination refreshes once and preserves the cursor on retry', async () => {
  globalThis.document = { cookie: 'sp_csrf=csrf' }
  const calls = []
  globalThis.fetch = async url => {
    calls.push(url)
    return new Response('{}', { status: calls.length === 1 ? 401 : 200 })
  }
  const url = '/api/auth/sessions?cursor=opaque-cursor'
  assert.equal((await sessionFetch(url, { token: true })).status, 200)
  assert.deepEqual(calls, [url, '/api/auth/refresh', url])
})

test('profile save refreshes expired access once and retries with rotated csrf and original body', async () => {
  globalThis.document = { cookie: 'sp_csrf=old' }
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    if (url === '/api/auth/refresh') {
      globalThis.document.cookie = 'sp_csrf=rotated'
      return new Response('{}', { status: 200 })
    }
    return new Response('{}', { status: calls.length === 1 ? 401 : 200 })
  }
  const body = JSON.stringify({ display_name: 'An' })
  const result = await sessionFetch('/api/auth/profile', { token: true, method: 'PATCH', body })
  assert.equal(result.status, 200)
  assert.deepEqual(calls.map(call => call.url), ['/api/auth/profile', '/api/auth/refresh', '/api/auth/profile'])
  assert.equal(calls[2].init.body, body)
  assert.equal(calls[2].init.headers.get('X-CSRF-Token'), 'rotated')
})

test('profile refresh failure returns unauthorized without retrying the mutation', async () => {
  globalThis.document = { cookie: 'sp_csrf=old' }
  const calls = []
  globalThis.fetch = async url => { calls.push(url); return new Response('{}', { status: 401 }) }
  const result = await sessionFetch('/api/auth/profile', { token: true, method: 'PATCH', body: '{}' })
  assert.equal(result.status, 401)
  assert.deepEqual(calls, ['/api/auth/profile', '/api/auth/refresh'])
})
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
