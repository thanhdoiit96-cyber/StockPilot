export const AUTH_STORAGE_KEY = 'market-auth'
export const SESSION_EXPIRED_EVENT = 'stockpilot:session-expired'

export function clearStoredAuth() {
  try { localStorage.removeItem(AUTH_STORAGE_KEY) } catch {}
}

export function isStoredAuth(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    typeof value.token === 'string' &&
    value.token.trim() &&
    value.user &&
    typeof value.user === 'object' &&
    typeof value.user.email === 'string' &&
    value.user.email.trim() &&
    typeof value.user.role === 'string' &&
    value.user.role.trim()
  )
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
