import PageLoadingOverlay from './PageLoadingOverlay.jsx'

export default function AuthSessionGate({ status, message, onRetry, onSignIn }) {
  if (status === 'verifying') {
    return <div className="auth-page" aria-busy="true">
      <PageLoadingOverlay active label="Đang xác minh phiên đăng nhập..." />
    </div>
  }

  return <div className="auth-page">
    <section className="auth-card panel auth-session-gate" role="alert" aria-live="assertive">
      <p className="eyebrow accent">Xác minh phiên</p>
      <h1>Chưa thể xác minh đăng nhập</h1>
      <p className="muted-text">{message || 'Không thể kết nối máy chủ để xác minh phiên. Dữ liệu cá nhân chưa được hiển thị.'}</p>
      <div className="auth-session-actions">
        <button className="primary-btn" type="button" onClick={onRetry}>Thử xác minh lại</button>
        <button className="ghost-btn" type="button" onClick={onSignIn}>Đăng nhập lại</button>
      </div>
    </section>
  </div>
}
