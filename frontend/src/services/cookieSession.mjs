const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
let refreshPromise = null

function resolveApiUrl(url = '') {
  if (!url || typeof url !== 'string') return url
  if (/^https?:\/\//i.test(url) || url.startsWith('//')) return url
  const base = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_BASE_URL)
    ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '')
    : ''
  if (!base) return url
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`
}

export function readCsrfCookie(cookieHeader = globalThis.document?.cookie || '') {
  for (const part of String(cookieHeader).split(';')) {
    const separator = part.indexOf('=')
    if (separator < 1 || part.slice(0, separator).trim() !== 'sp_csrf') continue
    try { return decodeURIComponent(part.slice(separator + 1).trim()) } catch { return '' }
  }
  return ''
}

async function refreshSession() {
  if (refreshPromise) return refreshPromise
  const csrf = readCsrfCookie()
  if (!csrf) return false
  const refreshUrl = resolveApiUrl('/api/auth/refresh')
  refreshPromise = fetch(refreshUrl, {
    method: 'POST', credentials: 'same-origin',
    headers: { Accept: 'application/json', 'X-CSRF-Token': csrf }
  }).then(response => response.ok).catch(() => false).finally(() => { refreshPromise = null })
  return refreshPromise
}

export async function sessionFetch(url, { token, retry = true, ...init } = {}) {
  const resolvedUrl = resolveApiUrl(url)
  const method = String(init.method || 'GET').toUpperCase()
  const headers = new Headers(init.headers || {})
  headers.set('Accept', headers.get('Accept') || 'application/json')
  if (typeof token === 'string' && token) headers.set('Authorization', `Bearer ${token}`)
  if (resolvedUrl === '/api/auth/login' || resolvedUrl === '/api/auth/register' || url === '/api/auth/login' || url === '/api/auth/register') headers.set('X-Auth-Mode', 'cookie-v1')
  const csrf = readCsrfCookie()
  if (MUTATING_METHODS.has(method) && csrf) headers.set('X-CSRF-Token', csrf)
  const response = await fetch(resolvedUrl, { ...init, method, headers, credentials: 'same-origin' })
  const cookieMode = token === true || token == null
  const path = url.split('?')[0]
  const canRefresh = !path.startsWith('/api/auth/') || ['/api/auth/profile', '/api/auth/password', '/api/auth/sessions', '/api/auth/sessions/revoke-others', '/api/auth/sessions/revoke', '/api/auth/sessions/label'].includes(path)
  if (response.status === 401 && retry && cookieMode && canRefresh) {
    if (await refreshSession()) return sessionFetch(url, { ...init, token: true, retry: false })
  }
  return response
}

export function resetRefreshForTests() { refreshPromise = null }
