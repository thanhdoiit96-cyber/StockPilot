import { useEffect, useRef } from 'react'

export default function AuthErrorMessage({ message, mode = 'login', credentialCleared = false, t = key => key }) {
  const ref = useRef(null)
  useEffect(() => {
    if (message) ref.current?.focus()
  }, [message])
  if (!message) return null
  return <div className="auth-error-message error-text" role="alert" aria-live="assertive" aria-atomic="true" tabIndex={-1} ref={ref}>
    <strong>{t(mode === 'register' ? 'auth.registerError' : 'auth.loginError')}</strong>
    <span>{message}</span>
    <small>{t(credentialCleared ? 'auth.clearedHint' : 'auth.retryHint')}</small>
  </div>
}
