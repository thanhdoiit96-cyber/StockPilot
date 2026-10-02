export const AUTH_STORAGE_KEY = 'market-auth'
export const SESSION_EXPIRED_EVENT = 'stockpilot:session-expired'

export function clearStoredAuth() {
  try { localStorage.removeItem(AUTH_STORAGE_KEY) } catch {}
}

export function isStoredAuth(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof value.token === 'string' &&
    value.token.trim() &&
    value.user &&
    typeof value.user === 'object' &&
    !Array.isArray(value.user) &&
    typeof value.user.email === 'string' &&
    value.user.email.trim() &&
    typeof value.user.role === 'string' &&
    value.user.role.trim()
  )
}

export function authFromResponse(payload) {
  const value = payload && typeof payload === 'object'
    ? { token: payload.token, user: payload.user }
    : null
  if (!isStoredAuth(value)) {
    throw new Error('Máy chủ trả về phiên đăng nhập không hợp lệ. Vui lòng thử lại.')
  }
  return {
    token: value.token.trim(),
    user: {
      ...value.user,
      email: value.user.email.trim(),
      role: value.user.role.trim()
    }
  }
}

export function readStoredAuth() {
  try {
    const serialized = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!serialized) return null
    const value = JSON.parse(serialized)
    if (isStoredAuth(value)) return value
  } catch {}
  clearStoredAuth()
  return null
}

export function notifySessionExpired(message) {
  clearStoredAuth()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { message } }))
  }
}
