import {
  MARKET_COLUMNS_KEY,
  MARKET_COLUMN_DEFINITIONS,
  normalizeMarketColumns,
  serializeMarketBoardCsv
} from './market-board-tools-core.mjs'

export { MARKET_COLUMNS_KEY, MARKET_COLUMN_DEFINITIONS, normalizeMarketColumns, serializeMarketBoardCsv }

const styles = `
  .market-board-tools {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin-left: auto;
  }
  .market-board-tools .ghost-btn { min-height: 36px; white-space: nowrap; }
  .market-board-column-picker { position: relative; }
  .market-board-column-picker > summary { list-style: none; cursor: pointer; }
  .market-board-column-picker > summary::-webkit-details-marker { display: none; }
  .market-board-column-picker[open] > summary { border-color: var(--primary); color: var(--primary); }
  .market-board-column-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 30;
    display: grid;
    gap: 9px;
    min-width: 230px;
    margin: 0;
    padding: 14px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: #101a2d;
    box-shadow: 0 18px 42px rgba(2, 8, 23, .42);
  }
  .market-board-column-menu legend { padding: 0 0 3px; color: var(--text); font-size: .78rem; font-weight: 700; }
  .market-board-column-menu label { display: flex; align-items: center; gap: 9px; color: var(--muted); font-size: .76rem; cursor: pointer; }
  .market-board-column-menu input { width: 16px; height: 16px; accent-color: var(--primary); }
  .market-board-column-menu .ghost-btn { width: 100%; margin-top: 3px; }
  .market-board-toolbar-status { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .table-panel.market-board-hide-name th:nth-child(2), .table-panel.market-board-hide-name td:nth-child(2),
  .table-panel.market-board-hide-volume th:nth-child(5), .table-panel.market-board-hide-volume td:nth-child(5),
  .table-panel.market-board-hide-analysis th:nth-child(7), .table-panel.market-board-hide-analysis td:nth-child(7),
  .table-panel.market-board-hide-actions th:nth-child(8), .table-panel.market-board-hide-actions td:nth-child(8) { display: none !important; }
  .table-panel .table-wrap th:first-child,
  .table-panel .table-wrap td:first-child {
    position: sticky;
    left: 0;
    z-index: 2;
    background: #101a2d;
  }
  .table-panel .table-wrap th:first-child { z-index: 4; background: #111d31; }
  .table-panel .table-wrap.is-horizontally-scrolled th:first-child,
  .table-panel .table-wrap.is-horizontally-scrolled td:first-child { box-shadow: 10px 0 18px -15px rgba(94, 234, 212, .9); }
  .table-panel tbody tr:hover td:first-child { background: #13233a; }
  @media (max-width: 620px) {
    .table-panel > .panel-header { align-items: stretch; flex-direction: column; }
    .market-board-tools { width: 100%; margin-left: 0; }
    .market-board-tools > * { flex: 1 1 0; }
    .market-board-tools .ghost-btn, .market-board-column-picker > summary { width: 100%; justify-content: center; }
    .market-board-column-menu { right: auto; left: 0; min-width: min(280px, calc(100vw - 52px)); }
  }
`

const readMarketColumns = storage => {
  try { return normalizeMarketColumns(JSON.parse(storage.getItem(MARKET_COLUMNS_KEY) || '{}')) } catch (_) { return normalizeMarketColumns() }
}

const writeMarketColumns = (storage, columns) => {
  try { storage.setItem(MARKET_COLUMNS_KEY, JSON.stringify(columns)) } catch (_) { }
}

const applyMarketColumns = (panel, columns) => {
  MARKET_COLUMN_DEFINITIONS.forEach(column => panel.classList.toggle(`market-board-hide-${column.key}`, columns[column.key] === false))
  panel.querySelectorAll('[data-market-column]').forEach(input => { input.checked = columns[input.dataset.marketColumn] !== false })
}

const downloadMarketBoard = (documentRef, panel, columns) => {
  const headers = [...panel.querySelectorAll('thead th')].map(header => header.textContent || '')
  const rows = [...panel.querySelectorAll('tbody tr')]
    .filter(row => row.querySelector('.symbol'))
    .map(row => [...row.cells].map(cell => cell.textContent || ''))
  const blob = new Blob([serializeMarketBoardCsv({ headers, rows, columns })], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = documentRef.createElement('a')
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
  link.href = url
  link.download = `stockpilot-bang-gia-${date}.csv`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

const installStyles = documentRef => {
  if (documentRef.getElementById('market-board-tools-styles')) return
  const style = documentRef.createElement('style')
  style.id = 'market-board-tools-styles'
  style.textContent = styles
  documentRef.head.append(style)
}

const reconcileMarketBoardTools = documentRef => {
  const panel = documentRef.querySelector('.table-panel')
  const header = panel?.querySelector(':scope > .panel-header')
  if (!panel || !header) return
  const storage = window.localStorage
  let tools = header.querySelector('.market-board-tools')
  if (!tools) {
    tools = documentRef.createElement('div')
    tools.className = 'market-board-tools'
    tools.innerHTML = '<button type="button" class="ghost-btn market-board-export">Xuất CSV</button><details class="market-board-column-picker"><summary class="ghost-btn">Cột hiển thị</summary><fieldset class="market-board-column-menu"><legend>Tùy chỉnh Bảng giá</legend>' + MARKET_COLUMN_DEFINITIONS.map(column => `<label><input type="checkbox" data-market-column="${column.key}"> ${column.label}</label>`).join('') + '<button type="button" class="ghost-btn market-board-columns-reset">Khôi phục mặc định</button></fieldset></details><span class="market-board-toolbar-status" role="status" aria-live="polite"></span>'
    header.append(tools)
    tools.querySelector('.market-board-export').addEventListener('click', () => downloadMarketBoard(documentRef, panel, readMarketColumns(storage)))
    tools.querySelectorAll('[data-market-column]').forEach(input => input.addEventListener('change', () => {
      const columns = readMarketColumns(storage)
      columns[input.dataset.marketColumn] = input.checked
      writeMarketColumns(storage, columns)
      applyMarketColumns(panel, columns)
      tools.querySelector('.market-board-toolbar-status').textContent = `Đã ${input.checked ? 'hiện' : 'ẩn'} cột ${input.parentElement.textContent.trim()}`
    }))
    tools.querySelector('.market-board-columns-reset').addEventListener('click', () => {
      const defaults = normalizeMarketColumns()
      writeMarketColumns(storage, defaults)
      applyMarketColumns(panel, defaults)
      tools.querySelector('.market-board-toolbar-status').textContent = 'Đã khôi phục các cột mặc định'
    })
  }
  const rowCount = panel.querySelectorAll('tbody tr .symbol').length
  const exportButton = tools.querySelector('.market-board-export')
  const exportLabel = `Xuất CSV (${rowCount})`
  if (exportButton.textContent !== exportLabel) exportButton.textContent = exportLabel
  exportButton.disabled = rowCount === 0
  exportButton.title = rowCount ? `Xuất ${rowCount} mã trong trang và bộ lọc hiện tại` : 'Chưa có dữ liệu để xuất'
  applyMarketColumns(panel, readMarketColumns(storage))
  const wrap = panel.querySelector('.table-wrap')
  if (wrap && !wrap.dataset.marketStickyBound) {
    wrap.dataset.marketStickyBound = '1'
    const syncScrolled = () => wrap.classList.toggle('is-horizontally-scrolled', wrap.scrollLeft > 2)
    wrap.addEventListener('scroll', syncScrolled, { passive: true })
    syncScrolled()
  }
}

const isRelevantMutation = mutation => {
  const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement
  if (target?.closest?.('.table-panel')) return true
  return [...mutation.addedNodes].some(node => node instanceof Element && (node.matches('.table-panel') || node.querySelector('.table-panel')))
}

export const installMarketBoardTools = (documentRef = document) => {
  installStyles(documentRef)
  let scheduled = false
  const reconcile = () => {
    scheduled = false
    reconcileMarketBoardTools(documentRef)
  }
  const schedule = () => {
    if (scheduled) return
    scheduled = true
    window.requestAnimationFrame(reconcile)
  }
  reconcile()
  const observer = new MutationObserver(mutations => {
    if (mutations.some(isRelevantMutation)) schedule()
  })
  observer.observe(documentRef.body, { childList: true, subtree: true })
  window.addEventListener('stockpilot:market-board-tools-refresh', schedule)
  return () => {
    observer.disconnect()
    window.removeEventListener('stockpilot:market-board-tools-refresh', schedule)
  }
}

if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') installMarketBoardTools()
