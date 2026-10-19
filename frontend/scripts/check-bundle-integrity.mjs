import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8')
const asset = html.match(/<script type="module"[^>]+src="\/assets\/([^"']+\.js)"/)?.[1]
if (!asset) throw new Error('Không tìm thấy JavaScript asset trong dist/index.html')
const javascriptAssets = fs.readdirSync(path.join(root, 'dist/assets')).filter(file => file.endsWith('.js'))
const completeBundle = javascriptAssets.map(file => fs.readFileSync(path.join(root, 'dist/assets', file), 'utf8')).join('\n')
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
const missing = checks.filter(([, marker]) => !marker.test(completeBundle)).map(([label]) => label)
if (missing.length) throw new Error(`Bundle không đạt kiểm tra: ${missing.join(', ')}`)

const overviewChecks = [
  ['cột Phân tích', /overview-analysis-action/],
  ['nhãn mở phân tích', /Phân tích chuyên sâu/],
  ['độ rộng thị trường', /market-breadth-panel/],
  ['phân bổ danh mục', /allocation-panel/],
  ['biểu đồ chi tiết', /detail-chart-panel/]
]
const missingOverview = overviewChecks.filter(([, marker]) => !marker.test(completeBundle)).map(([label]) => label)
if (missingOverview.length) throw new Error(`Component React không đạt kiểm tra: ${missingOverview.join(', ')}`)

const marketBoardChecks = [
  ['component Bảng giá React', /data-react-market-board/],
  ['quote lifecycle Bảng giá', /board_refresh/],
  ['cấu hình cột', /stockpilot-market-columns-v1/],
  ['xuất CSV', /stockpilot-bang-gia-/]
]
const missingMarketBoard = marketBoardChecks.filter(([, marker]) => !marker.test(completeBundle)).map(([label]) => label)
if (missingMarketBoard.length) throw new Error(`Công cụ Bảng giá không đạt kiểm tra: ${missingMarketBoard.join(', ')}`)

const sidebarChecks = [
  ['icon sidebar có hướng', /data-sidebar-direction/],
  ['nhãn thu gọn', /Thu gọn thanh điều hướng/],
  ['nhãn mở rộng', /Mở rộng thanh điều hướng/]
]
const missingSidebar = sidebarChecks.filter(([, marker]) => !marker.test(completeBundle)).map(([label]) => label)
if (missingSidebar.length) throw new Error(`Runtime sidebar không đạt kiểm tra: ${missingSidebar.join(', ')}`)

console.log(`Bundle integrity passed: ${asset} + ${javascriptAssets.length - 1} chunks; Tổng quan, Bảng giá, Danh mục, Chi tiết và sidebar: React`)
