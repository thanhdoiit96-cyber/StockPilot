export const AUTH_STORAGE_KEY = 'market-auth'
export const SESSION_EXPIRED_EVENT = 'stockpilot:session-expired'

export function clearStoredAuth() {
  try { localStorage.removeItem(AUTH_STORAGE_KEY) } catch {}
}

export function notifySessionExpired(message) {
  clearStoredAuth()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { message } }))
  }
}
