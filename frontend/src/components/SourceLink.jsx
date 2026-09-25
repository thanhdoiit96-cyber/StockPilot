import React from 'react'

export default function SourceLink({ url, children }) {
  let href
  try {
    const parsed = new URL(url)
    if (['https:', 'http:'].includes(parsed.protocol)) href = parsed.href
  } catch (_) { /* A missing or invalid URL remains plain text. */ }
  if (!href) return <>{children}</>
  return <a className="source-link" href={href} title={href} aria-label={`${children} — ${href}`} target="_blank" rel="noopener noreferrer" onClick={event => event.stopPropagation()}>{children}<span aria-hidden="true"> ↗</span></a>
}
