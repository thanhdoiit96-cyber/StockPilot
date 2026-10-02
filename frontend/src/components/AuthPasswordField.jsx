import { useState } from 'react'

export default function AuthPasswordField({ value, onChange, mode = 'login', disabled = false }) {
  const [visible, setVisible] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const descriptionId = mode === 'register' ? 'auth-password-requirements' : undefined
  const detectCapsLock = event => setCapsLock(Boolean(event.getModifierState?.('CapsLock')))
  return <div className="auth-password-field">
    <label htmlFor="auth-password">Mật khẩu</label>
    <div className="auth-password-input">
      <input id="auth-password" aria-label="Mật khẩu đăng nhập" aria-describedby={descriptionId} type={visible ? 'text' : 'password'} placeholder="Tối thiểu 8 ký tự" value={value} onChange={event => onChange(event.target.value)} onKeyDown={detectCapsLock} onKeyUp={detectCapsLock} onBlur={() => setCapsLock(false)} required minLength={8} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} disabled={disabled} />
      <button type="button" className="auth-password-toggle" aria-pressed={visible} aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} disabled={disabled} onClick={() => setVisible(current => !current)}>{visible ? 'Ẩn' : 'Hiện'}</button>
    </div>
    {mode === 'register' ? <small id={descriptionId}>Dùng ít nhất 8 ký tự. Không sử dụng lại mật khẩu ở dịch vụ khác.</small> : null}
    {capsLock ? <small className="auth-caps-warning" role="status">Caps Lock đang bật.</small> : null}
  </div>
}
