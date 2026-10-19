export const APP_VIEWS = Object.freeze([
  'overview',
  'market-board',
  'portfolio',
  'detail',
  'recommendations',
  'advisor'
])

const APP_VIEW_SET = new Set(APP_VIEWS)

export const normalizeAppView = value => APP_VIEW_SET.has(value) ? value : 'overview'

export const readAppView = (location, storedView = null) => {
  const params = new URLSearchParams(location?.search || '')
  if (params.has('stock')) return 'detail'
  if (params.has('view')) return normalizeAppView(params.get('view'))
  return normalizeAppView(storedView)
}

export const writeAppView = (location, view, stockId = null) => {
  const url = new URL(location.href)
  const normalizedView = normalizeAppView(view)

  if (normalizedView === 'overview') url.searchParams.delete('view')
  else url.searchParams.set('view', normalizedView)

  if (normalizedView === 'detail' && stockId) url.searchParams.set('stock', String(stockId))
  else url.searchParams.delete('stock')

  url.searchParams.delete('symbol')
  return url
}
