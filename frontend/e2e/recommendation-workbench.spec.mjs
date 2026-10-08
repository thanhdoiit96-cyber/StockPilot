import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('Recommendation mutation error is localized and recoverable', async ({ page }) => {
  await page.route('**/api/**', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname
    if (path === '/api/auth/me') return route.fulfill({ json: { success: true, user: { email: 'e2e@example.com', role: 'user', preferred_language: 'vi' } } })
    if (path === '/api/recommendations/personalized' && request.method() === 'POST') return route.fulfill({ status: 503, json: { success: false, code: 'recommendation_personalized_failed', message: 'backend failure' } })
    let data = null
    if (path === '/api/stocks') data = []
    else if (path === '/api/portfolio') data = { positions: [], recommendation_entries: [] }
    else if (path === '/api/watchlist') data = []
    else if (path === '/api/recommendations/latest') data = { recommendations: [] }
    else if (path === '/api/recommendations/history' || path === '/api/recommendations/readiness' || path === '/api/recommendations/saved') data = []
    else if (path === '/api/ai-gate') data = { enabled: false, reasons: [] }
    return route.fulfill({ json: { success: true, data } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Đề xuất', exact: true }).click()
  await page.getByRole('button', { name: 'Tạo đề xuất cá nhân', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Không thể tạo đề xuất theo tiêu chí hiện tại.')
  await expect(page.getByRole('button', { name: 'Tạo đề xuất cá nhân', exact: true })).toBeEnabled()
})

test('Recommendation mutation error is localized in English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('stockpilot-language', 'en'))
  await page.route('**/api/**', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname
    if (path === '/api/auth/me') return route.fulfill({ json: { success: true, user: { email: 'e2e@example.com', role: 'user', preferred_language: 'en' } } })
    if (path === '/api/recommendations/personalized' && request.method() === 'POST') return route.fulfill({ status: 503, json: { success: false, code: 'recommendation_personalized_failed', message: 'backend failure' } })
    let data = null
    if (path === '/api/stocks') data = []
    else if (path === '/api/portfolio') data = { positions: [], recommendation_entries: [] }
    else if (path === '/api/watchlist') data = []
    else if (path === '/api/recommendations/latest') data = { recommendations: [] }
    else if (path === '/api/recommendations/history' || path === '/api/recommendations/readiness' || path === '/api/recommendations/saved') data = []
    else if (path === '/api/ai-gate') data = { enabled: false, reasons: [] }
    return route.fulfill({ json: { success: true, data } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Ideas', exact: true }).click()
  await page.getByRole('button', { name: 'Create personal ideas', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Unable to create recommendations with the current criteria.')
  await expect(page.getByRole('button', { name: 'Create personal ideas', exact: true })).toBeEnabled()
})

test('recommendation criteria rerank the eligible universe and show historical learning readiness', async ({ page }) => {
  let submitted
  let savedTransaction
  const savedSnapshots = [
    { id: 'snapshot-new', createdAt: '2026-09-21T03:00:00.000Z', criteria: { trend: 20, momentum: 40 }, result: { recommendations: [{ symbol: 'VCB', rank: 1, score: 76 }, { symbol: 'HPG', rank: 2, score: 68 }] } },
    { id: 'snapshot-old', createdAt: '2026-09-20T03:00:00.000Z', criteria: { trend: 30, momentum: 20 }, result: { recommendations: [{ symbol: 'FPT', rank: 1, score: 80 }, { symbol: 'VCB', rank: 2, score: 70 }] } }
  ]
  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    let data = null
    if (path === '/api/stocks') data = [{ id: 'FPT', code: 'FPT', name: 'FPT', price: 120000 }]
    else if (path === '/api/stocks/quotes') data = {}
    else if (path === '/api/portfolio') data = { positions: [], recommendation_entries: [] }
    else if (path === '/api/watchlist') data = []
    else if (path === '/api/auth/me') return route.fulfill({ json: { success: true, user: { email: 'e2e@example.com', role: 'user' } } })
    else if (path === '/api/ai-gate') data = { enabled: false, reasons: [] }
    else if (path === '/api/recommendations/latest') data = { learning: { sample_count: 0, minimum_samples: 15, status: 'insufficient_history', evidence: Object.fromEntries(['trend', 'momentum', 'rsi', 'stability', 'liquidity'].map(key => [key, { samples: 0, adjustment: 1 }])) }, recommendations: [{ id: 'old-1', rank: 1, score: 61, entry_price: 120000, stock: { code: 'FPT' }, rationale: { factors: ['Snapshot gần nhất'] } }] }
    else if (path === '/api/recommendations/history') data = [{ id: 'run-1', as_of: '2026-09-01', selected_count: 5, measured_count: 5, pending_count: 0, hit_rate_pct: 60, average_forward_return_pct: 1.2 }]
    else if (path === '/api/recommendations/readiness') data = { coverage: [] }
    else if (path === '/api/recommendations/saved' && request.method() === 'GET') data = savedSnapshots
    else if (path === '/api/recommendations/saved' && request.method() === 'POST') {
      const body = request.postDataJSON()
      data = { id: 'snapshot-generated', createdAt: '2026-09-22T03:01:00.000Z', criteria: body.criteria, result: body.result }
    }
    else if (path === '/api/recommendations/personalized' && request.method() === 'POST') {
      submitted = request.postDataJSON()
      data = { recommendations: [{ stock_id: 'FPT', symbol: 'FPT', rank: 1, score: 83.2, entry_price: 121000, horizon_days: 20, rationale: { model: 'personalized_rule_v1', score_parts: { trend: 100, momentum: 80, rsi: 70, stability: 65, liquidity: 90 }, weights: submitted.criteria, calibration: { trend: 1.1 }, indicators: { rsi14: 55, momentum10: 3.2 }, trend: 'above_sma20', volatility_pct: 1.25, average_volume: 2500000, observations: 90, reference_plan: { price_source: 'intraday', observed_at: '2026-09-22T02:45:00.000Z' }, evidence: { sources: [{ type: 'news', source: 'Verified Wire', title: 'FPT update', source_url: 'https://example.com/fpt', published_at: '2026-09-21T02:00:00.000Z' }, { source: 'Unsafe', source_url: 'javascript:alert(1)', published_at: '2026-09-21T02:00:00.000Z' }] }, factors: ['Điểm được tính lại theo tiêu chí đã chọn'] } }], eligible_count: 131, model: 'personalized_rule_v1', generated_at: '2026-09-22T03:00:00.000Z', criteria: submitted.criteria, learning: { sample_count: 0, minimum_samples: 15, status: 'insufficient_history', evidence: Object.fromEntries(['trend', 'momentum', 'rsi', 'stability', 'liquidity'].map(key => [key, { samples: 0, adjustment: 1 }])) } }
    } else if (path === '/api/portfolio/transactions' && request.method() === 'POST') {
      savedTransaction = request.postDataJSON()
      data = { id: 'transaction-1' }
    } else if (path.startsWith('/api/stocks/')) data = { price_history: [] }
    return route.fulfill({ json: { success: true, data } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Đề xuất', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Bạn muốn ưu tiên điều gì?' })).toBeVisible()
  await expect(page.locator('.saved-proposals')).toHaveCount(0)
  const comparison = page.locator('.snapshot-comparison')
  await expect(comparison).toContainText('Thêm 1')
  await expect(comparison).toContainText('Giữ 1')
  await expect(comparison).toContainText('Bớt 1')
  await expect(comparison.locator('tbody')).toContainText('VCB')
  await expect(comparison.locator('tbody')).toContainText('+1')
  await page.locator('.criteria-control input[type="range"]').nth(1).fill('50')
  await page.getByRole('button', { name: 'Tạo đề xuất cá nhân' }).click()
  await expect(page.getByRole('heading', { name: 'Kết quả theo tiêu chí đã chọn' })).toBeVisible()
  await expect(page.locator('.personalized-list')).toContainText('FPT')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Xuất CSV đề xuất', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^stockpilot-recommendations-2026-09-22\.csv$/)
  const csv = await readFile(await download.path(), 'utf8')
  expect(csv).toContain('Mã')
  expect(csv).toContain('FPT')
  expect(csv).toContain('Verified Wire')
  expect(csv).not.toContain('Unsafe')
  const criteriaToggle = page.getByRole('button', { name: 'Mở tiêu chí' })
  await expect(criteriaToggle).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('#recommendation-criteria-form')).toBeHidden()
  await page.getByText('Xem bằng chứng chấm điểm').click()
  const evidence = page.locator('.recommendation-evidence')
  await expect(evidence).toContainText('personalized_rule_v1')
  await expect(evidence).toContainText('Intraday')
  await expect(evidence).toContainText('90')
  await expect(evidence).toContainText('Xu hướng giá')
  await expect(evidence).toContainText('1,1×')
  await expect(evidence).toContainText('Nguồn ngoài hệ thống đã xác minh')
  await expect(evidence.getByRole('link', { name: 'FPT update' })).toHaveAttribute('href', 'https://example.com/fpt')
  await expect(evidence).not.toContainText('Unsafe')
  await expect(evidence).toContainText('không được cộng điểm')
  await expect(page.locator('.learning-status')).toContainText('Đang thu thập dữ liệu đánh giá')
  await expect(page.locator('.learning-definition')).toContainText('Lịch sử chung và kết quả từng mã là hai thước đo riêng')
  await expect(page.getByRole('heading', { name: 'Lịch sử các đợt đề xuất chung' })).toBeVisible()
  await criteriaToggle.click()
  await expect(page.getByRole('button', { name: 'Thu gọn tiêu chí' })).toHaveAttribute('aria-expanded', 'true')
  const savedPicker = page.locator('#saved-proposal-select')
  await expect(savedPicker.locator('option')).toHaveCount(4)
  await savedPicker.selectOption({ index: 1 })
  await page.locator('.saved-proposal-picker').getByRole('button', { name: 'Load' }).click()
  await expect(page.locator('.criteria-control input[type="range"]').nth(1)).toHaveValue('50')
  await page.locator('.saved-proposal-picker').getByRole('button', { name: 'Xóa' }).click()
  await expect(savedPicker.locator('option')).toHaveCount(3)
  expect(submitted.criteria.momentum).toBe(50)
  expect(submitted.limit).toBe(10)
  const recommendation = page.locator('.personalized-list > li').first()
  await expect(recommendation.getByRole('link', { name: 'FPT', exact: true })).toHaveAttribute('href', '/?stock=FPT')
  const watch = recommendation.getByRole('button', { name: 'Thêm FPT vào Watchlist' })
  await expect(watch).toHaveText('☆')
  await watch.click()
  await expect(recommendation.getByRole('button', { name: 'FPT đã có trong Watchlist' })).toHaveText('★')
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
