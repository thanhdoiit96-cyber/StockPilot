import { useEffect, useRef } from 'react'

export default function PageLoadingOverlay({ active, id, className = '', label = 'Đang cập nhật dữ liệu mới nhất…' }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    if (!active) return undefined
    const previousFocus = document.activeElement
    const bodyOverflow = document.body.style.overflow
    const rootOverflow = document.documentElement.style.overflow
    const blockKeyboard = event => {
      event.preventDefault()
      event.stopPropagation()
    }
    const blockScroll = event => event.preventDefault()
    const retainFocus = event => {
      if (event.target !== overlayRef.current) overlayRef.current?.focus()
    }

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.documentElement.dataset.pageLoading = 'true'
    document.addEventListener('keydown', blockKeyboard, true)
    document.addEventListener('wheel', blockScroll, { capture: true, passive: false })
    document.addEventListener('touchmove', blockScroll, { capture: true, passive: false })
    document.addEventListener('focusin', retainFocus, true)
    overlayRef.current?.focus()

    return () => {
      document.body.style.overflow = bodyOverflow
      document.documentElement.style.overflow = rootOverflow
      delete document.documentElement.dataset.pageLoading
      document.removeEventListener('keydown', blockKeyboard, true)
      document.removeEventListener('wheel', blockScroll, true)
      document.removeEventListener('touchmove', blockScroll, true)
      document.removeEventListener('focusin', retainFocus, true)
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [active])

  if (!active) return null
  return <div id={id} className={`page-loading-overlay ${className}`.trim()} ref={overlayRef} tabIndex="-1" role="status" aria-live="assertive" aria-label={label}>
    <div className="page-loading-card">
      <div className="loading-logo" aria-hidden="true">S</div>
      <span className="loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  </div>
}
