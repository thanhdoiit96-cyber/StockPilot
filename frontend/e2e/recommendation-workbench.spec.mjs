import { test, expect } from '@playwright/test'

test('recommendation criteria rerank the eligible universe and show historical learning readiness', async ({ page }) => {
  let submitted
  let savedTransaction
  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    let data = null
    if (path === '/api/stocks') data = [{ id: 'FPT', code: 'FPT', name: 'FPT', price: 120000 }]
    else if (path === '/api/stocks/quotes') data = {}
    else if (path === '/api/portfolio') data = { positions: [], recommendation_entries: savedTransaction ? [{ transaction_id: 'transaction-1', symbol: savedTransaction.symbol, actual_entry_price: Number(savedTransaction.price), traded_at: '2026-09-22', recommendation: savedTransaction.recommendation_context, evaluation: { status: 'pending', sessions_observed: 0, horizon_days: 20, outcome: 'pending' } }] : [] }
    else if (path === '/api/watchlist') data = []
    else if (path === '/api/auth/me') return route.fulfill({ json: { success: true, user: { email: 'e2e@example.com', role: 'user' } } })
    else if (path === '/api/ai-gate') data = { enabled: false, reasons: [] }
    else if (path === '/api/recommendations/latest') data = { recommendations: [{ id: 'old-1', rank: 1, score: 61, entry_price: 120000, stock: { code: 'FPT' }, rationale: { factors: ['Snapshot gần nhất'] } }] }
    else if (path === '/api/recommendations/history') data = [{ id: 'run-1', as_of: '2026-09-01', selected_count: 5, measured_count: 5, pending_count: 0, hit_rate_pct: 60, average_forward_return_pct: 1.2 }]
    else if (path === '/api/recommendations/readiness') data = { coverage: [] }
    else if (path === '/api/recommendations/personalized' && request.method() === 'POST') {
      submitted = request.postDataJSON()
      data = { recommendations: [{ stock_id: 'FPT', symbol: 'FPT', rank: 1, score: 83.2, entry_price: 121000, horizon_days: 20, rationale: { score_parts: { trend: 100, momentum: 80, rsi: 70, stability: 65, liquidity: 90 }, weights: submitted.criteria, indicators: { rsi14: 55 }, observations: 90, factors: ['Điểm được tính lại theo tiêu chí đã chọn'] } }], eligible_count: 131, model: 'personalized_rule_v1', generated_at: '2026-09-22T03:00:00.000Z', criteria: submitted.criteria, learning: { sample_count: 0, minimum_samples: 15, status: 'insufficient_history', evidence: Object.fromEntries(['trend', 'momentum', 'rsi', 'stability', 'liquidity'].map(key => [key, { samples: 0, adjustment: 1 }])) } }
    } else if (path === '/api/portfolio/transactions' && request.method() === 'POST') {
      savedTransaction = request.postDataJSON()
      data = { id: 'transaction-1' }
    } else if (path.startsWith('/api/stocks/')) data = { price_history: [] }
    return route.fulfill({ json: { success: true, data } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Đề xuất', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Bạn muốn ưu tiên điều gì?' })).toBeVisible()
  await page.locator('.criteria-control input[type="range"]').nth(1).fill('50')
  await page.getByRole('button', { name: 'Tạo đề xuất cá nhân' }).click()
  await expect(page.getByRole('heading', { name: 'Kết quả theo tiêu chí đã chọn' })).toBeVisible()
  await expect(page.locator('.personalized-list')).toContainText('FPT')
  await expect(page.locator('.learning-status')).toContainText('Đang thu thập dữ liệu đánh giá')
  await expect(page.locator('.learning-definition')).toContainText('Lịch sử chung và kết quả từng mã là hai thước đo riêng')
  await expect(page.getByRole('heading', { name: 'Lịch sử các đợt đề xuất chung' })).toBeVisible()
  const savedPicker = page.locator('#saved-proposal-select')
  await expect(savedPicker.locator('option')).toHaveCount(2)
  await savedPicker.selectOption({ index: 1 })
  await page.locator('.saved-proposal-picker').getByRole('button', { name: 'Load' }).click()
  await expect(page.locator('.criteria-control input[type="range"]').nth(1)).toHaveValue('50')
  await page.locator('.saved-proposal-picker').getByRole('button', { name: 'Xóa' }).click()
  await expect(savedPicker.locator('option')).toHaveCount(1)
  expect(submitted.criteria.momentum).toBe(50)
  expect(submitted.limit).toBe(10)
  await page.getByRole('button', { name: /Thêm vào danh mục/ }).click()
  await expect(page.locator('.personal-page')).toBeVisible()
  await expect(page.locator('.transaction-form input').nth(0)).toHaveValue('FPT')
  await expect(page.locator('.transaction-form input').nth(2)).toHaveValue('121000')
  await page.locator('.transaction-form input').nth(1).fill('5')
  await page.getByRole('button', { name: 'Lưu giao dịch' }).click()
  await expect.poll(() => savedTransaction?.recommendation_context?.source).toBe('personalized')
  expect(savedTransaction.recommendation_context).toMatchObject({ horizon_days: 20, score: 83.2, expected_entry_price: 121000, criteria: { momentum: 50 } })
  await expect(page.locator('.recommendation-tracking-table')).toContainText('FPT')
  await expect(page.locator('.recommendation-tracking-table')).toContainText('Đang chờ 0/20 phiên')
})
