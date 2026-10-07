import { useState } from 'react'

export default function AuthPasswordField({ value, onChange, mode = 'login', disabled = false, t = key => key }) {
  const [visible, setVisible] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const descriptionId = mode === 'register' ? 'auth-password-requirements' : undefined
  const detectCapsLock = event => setCapsLock(Boolean(event.getModifierState?.('CapsLock')))
  return <div className="auth-password-field">
    <label htmlFor="auth-password">{t('auth.password')}</label>
    <div className="auth-password-input">
      <input id="auth-password" aria-label={t('auth.passwordAria')} aria-describedby={descriptionId} type={visible ? 'text' : 'password'} placeholder={t('auth.passwordPlaceholder')} value={value} onChange={event => onChange(event.target.value)} onKeyDown={detectCapsLock} onKeyUp={detectCapsLock} onBlur={() => setCapsLock(false)} required minLength={8} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} disabled={disabled} />
      <button type="button" className="auth-password-toggle" aria-pressed={visible} aria-label={t(visible ? 'auth.hidePassword' : 'auth.showPassword')} disabled={disabled} onClick={() => setVisible(current => !current)}>{t(visible ? 'auth.hide' : 'auth.show')}</button>
    </div>
    {mode === 'register' ? <small id={descriptionId}>{t('auth.passwordHint')}</small> : null}
    {capsLock ? <small className="auth-caps-warning" role="status">{t('auth.capsLock')}</small> : null}
  </div>
}
