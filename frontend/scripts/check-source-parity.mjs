import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const sourcePaths = [
  path.join(root, 'src/App.jsx'),
  path.join(root, 'src/components/DetailWorkspace.jsx'),
  path.join(root, 'src/components/PageLoadingOverlay.jsx'),
  path.join(root, 'src/components/DetailAnalysisStatus.jsx'),
  path.join(root, 'src/components/DetailExpertGuidance.jsx')
]
const source = sourcePaths.map(sourcePath => fs.readFileSync(sourcePath, 'utf8')).join('\n')

// Keep this list aligned with check-bundle-integrity.mjs. These markers are
// stable DOM/API contracts, unlike compiled variable names.
const checks = [
  ['trang Đề xuất', /recommendation/],
  ['loading overlay', /loading-overlay/],
  ['phân trang dashboard', /pageSize=/],
  ['endpoint quote Chi tiết mã', /\/quote/],
  ['nút thêm mã từ Chi tiết', /detail-add-btn/],
  ['khôi phục phân tích theo mã', /analysis-requested:/],
  ['trạng thái phân tích', /analysis-status-row/],
  ['khối nhận định chuyên gia', /expert-guidance-panel/],
  ['chỉ báo Ichimoku', /ichimoku/i]
]

const missing = checks.filter(([, marker]) => !marker.test(source)).map(([label]) => label)
if (missing.length) {
  console.error('Source App.jsx chưa đồng bộ với bundle đang chạy:')
  for (const label of missing) console.error(`- ${label}`)
  process.exitCode = 1
} else {
  console.log(`Source parity passed: ${checks.length} feature markers`) 
}
