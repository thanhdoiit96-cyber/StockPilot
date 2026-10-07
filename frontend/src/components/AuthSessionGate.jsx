import PageLoadingOverlay from './PageLoadingOverlay.jsx'

export default function AuthSessionGate({ status, message, onRetry, onSignIn, t = key => key, language = 'vi' }) {
  if (status === 'verifying') {
    return <div className="auth-page" lang={language} aria-busy="true">
      <PageLoadingOverlay active label={t('auth.verifying')} />
    </div>
  }

  return <div className="auth-page" lang={language}>
    <section className="auth-card panel auth-session-gate" role="alert" aria-live="assertive">
      <p className="eyebrow accent">{t('auth.verifyKicker')}</p>
      <h1>{t('auth.verifyTitle')}</h1>
      <p className="muted-text">{message || t('auth.verifyFallback')}</p>
      <div className="auth-session-actions">
        <button className="primary-btn" type="button" onClick={onRetry}>{t('auth.retryVerify')}</button>
        <button className="ghost-btn" type="button" onClick={onSignIn}>{t('auth.signInAgain')}</button>
      </div>
    </section>
  </div>
}
