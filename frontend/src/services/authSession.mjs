export const AUTH_STORAGE_KEY = 'market-auth'
export const SESSION_EXPIRED_EVENT = 'stockpilot:session-expired'

export function clearStoredAuth() {
  try { localStorage.removeItem(AUTH_STORAGE_KEY) } catch {}
}

export function broadcastAuthEvent(type) {
  try {
    const event = { type, at: Date.now(), nonce: Math.random().toString(36).slice(2) }
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('stockpilot-auth')
      channel.postMessage(event)
      channel.close()
      return
    }
    if (type === 'logout') return localStorage.removeItem(AUTH_STORAGE_KEY)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(event))
  } catch {}
}

export function isStoredAuth(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && typeof value.token === 'string' && value.token.trim() && value.user && typeof value.user === 'object' && !Array.isArray(value.user) && typeof value.user.email === 'string' && value.user.email.trim() && typeof value.user.role === 'string' && value.user.role.trim())
}

function validUser(user) {
  return Boolean(user && typeof user === 'object' && !Array.isArray(user) && typeof user.email === 'string' && user.email.trim() && typeof user.role === 'string' && user.role.trim())
}

function normalizeAuth(value) {
  return { token: typeof value.token === 'string' ? value.token.trim() : true, ...(value.mode ? { mode: value.mode } : {}), user: { ...value.user, email: value.user.email.trim(), role: value.user.role.trim() } }
}

export function authFromStorageValue(serialized) {
  let value
  try { value = JSON.parse(serialized) } catch {}
  if (value && ['login', 'identity-changed'].includes(value.type) && Number.isFinite(value.at) && typeof value.nonce === 'string') return { event: value.type }
  if (!isStoredAuth(value)) throw new Error('Dữ liệu phiên đăng nhập không hợp lệ.')
  return normalizeAuth(value)
}

export function authFromResponse(payload) {
  if (!payload || typeof payload !== 'object' || !validUser(payload.user)) throw new Error('Máy chủ trả về phiên đăng nhập không hợp lệ. Vui lòng thử lại.')
  return normalizeAuth({ token: typeof payload.token === 'string' ? payload.token : true, mode: typeof payload.token === 'string' ? 'bearer' : 'cookie', user: payload.user })
}

export function readStoredAuth() {
  try {
    const serialized = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!serialized) return null
    const parsed = authFromStorageValue(serialized)
    if (parsed.event) return null
    return parsed
  } catch {}
  clearStoredAuth()
  return null
}

export function notifySessionExpired(message) {
  clearStoredAuth()
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { message } }))
}
