import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8')
const asset = html.match(/assets\/([^"']+\.js)/)?.[1]
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
console.log(`Bundle integrity passed: ${asset}`)
