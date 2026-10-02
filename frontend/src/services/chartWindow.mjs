export function getChartWindow(items = [], requestedSize = 12, requestedOffset = 0) {
  const total = items.length
  const size = Math.max(1, Math.min(total || 1, Number(requestedSize) || 12))
  const offset = Math.max(0, Math.min(Math.max(0, total - size), Number(requestedOffset) || 0))
  const end = Math.max(0, total - offset)
  const start = Math.max(0, end - size)
  return {
    items: items.slice(start, end),
    start,
    end,
    total,
    size,
    offset,
    hasOlder: start > 0,
    hasNewer: end < total
  }
}
