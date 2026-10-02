import { useEffect, useRef } from 'react'

export default function AuthErrorMessage({ message, mode = 'login', credentialCleared = false }) {
  const ref = useRef(null)
  useEffect(() => {
    if (message) ref.current?.focus()
  }, [message])
  if (!message) return null
  return <div className="auth-error-message error-text" role="alert" aria-live="assertive" aria-atomic="true" tabIndex={-1} ref={ref}>
    <strong>{mode === 'register' ? 'Không thể tạo tài khoản' : 'Không thể đăng nhập'}</strong>
    <span>{message}</span>
    <small>{credentialCleared ? 'Thông tin xác thực cũ đã được xóa an toàn. Vui lòng đăng nhập lại.' : 'Thông tin bạn đã nhập vẫn được giữ để kiểm tra và thử lại.'}</small>
  </div>
}
