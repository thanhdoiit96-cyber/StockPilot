import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8')
const asset = html.match(/<script type="module"[^>]+src="\/assets\/([^"']+\.js)"/)?.[1]
if (!asset) throw new Error('Không tìm thấy JavaScript asset trong dist/index.html')
const bundle = fs.readFileSync(path.join(root, 'dist/assets', asset), 'utf8')
const checks = [
  ['page Đề xuất', /recommendation/],
  ['loading overlay', /loading-overlay/],
  // Request timing and settlement are verified by browser tests. Compiled
  // variable names are not stable across legitimate rebuilds.
  ['phân trang dashboard', /pageSize=/],
  ['endpoint quote Chi tiết mã', /\/quote/],
  ['nút thêm mã từ Chi tiết', /detail-add-btn/],
  ['khôi phục phân tích theo mã', /analysis-requested:/],
  ['trạng thái phân tích rõ ràng', /analysis-status-row/],
  ['khối nhận định chuyên gia', /expert-guidance-panel/],
  ['chỉ báo Ichimoku', /ichimoku/]
]
const missing = checks.filter(([, marker]) => !marker.test(bundle)).map(([label]) => label)
if (missing.length) throw new Error(`Bundle không đạt kiểm tra: ${missing.join(', ')}`)

const overviewRuntimeAsset = 'overview-table-actions.js'
if (!html.includes(`/assets/${overviewRuntimeAsset}`)) {
  throw new Error(`Bundle không nạp runtime Tổng quan: ${overviewRuntimeAsset}`)
}
const overviewRuntimePath = path.join(root, 'dist/assets', overviewRuntimeAsset)
if (!fs.existsSync(overviewRuntimePath)) {
  throw new Error(`Thiếu runtime Tổng quan: ${overviewRuntimeAsset}`)
}
const overviewRuntime = fs.readFileSync(overviewRuntimePath, 'utf8')
const overviewChecks = [
  ['cột Phân tích', /overview-analysis-action/],
  ['nhãn mở phân tích', /Mở phân tích chuyên sâu/],
  ['trạng thái hủy niêm yết', /Đã hủy niêm yết/],
  ['chú thích dữ liệu theo ngữ cảnh', /Giải thích Intraday, EOD và dữ liệu cũ/],
  ['bộ chọn số mã ở hàng phân trang', /overview-page-size-control/],
  ['bộ đếm mã ở hàng phân trang', /overview-pagination-count/],
  ['tìm kiếm và nhóm ngành cùng hàng', /overview-filter-row/]
]
const missingOverview = overviewChecks.filter(([, marker]) => !marker.test(overviewRuntime)).map(([label]) => label)
if (missingOverview.length) throw new Error(`Runtime Tổng quan không đạt kiểm tra: ${missingOverview.join(', ')}`)

const marketBoardChecks = [
  ['component Bảng giá React', /data-react-market-board/],
  ['quote lifecycle Bảng giá', /board_refresh/],
  ['cấu hình cột', /stockpilot-market-columns-v1/],
  ['xuất CSV', /stockpilot-bang-gia-/]
]
const missingMarketBoard = marketBoardChecks.filter(([, marker]) => !marker.test(bundle)).map(([label]) => label)
if (missingMarketBoard.length) throw new Error(`Công cụ Bảng giá không đạt kiểm tra: ${missingMarketBoard.join(', ')}`)

const sidebarChecks = [
  ['icon sidebar có hướng', /data-sidebar-direction/],
  ['nhãn thu gọn', /Thu gọn thanh điều hướng/],
  ['nhãn mở rộng', /Mở rộng thanh điều hướng/]
]
const missingSidebar = sidebarChecks.filter(([, marker]) => !marker.test(bundle)).map(([label]) => label)
if (missingSidebar.length) throw new Error(`Runtime sidebar không đạt kiểm tra: ${missingSidebar.join(', ')}`)

console.log(`Bundle integrity passed: ${asset}; runtime: ${overviewRuntimeAsset}; Bảng giá và sidebar: React`)
