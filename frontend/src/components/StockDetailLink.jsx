export function stockDetailHref(stockId, symbol) {
  const params = new URLSearchParams()
  if (stockId) params.set('stock', stockId)
  else if (symbol) params.set('symbol', String(symbol).toUpperCase())
  return `/?${params}`
}

export default function StockDetailLink({ stockId, symbol, onOpenDetail, className = '', children }) {
  const open = event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    event.stopPropagation()
    onOpenDetail?.(stockId, symbol)
  }
  return <a className={className} href={stockDetailHref(stockId, symbol)} onClick={open} title={`Mở Chi tiết mã ${symbol}`}>{children || symbol}</a>
}
