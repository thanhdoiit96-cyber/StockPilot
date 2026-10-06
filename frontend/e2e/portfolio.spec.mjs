import { test, expect } from '@playwright/test'
const stocks=[{id:'a',code:'FPT',name:'FPT Corp',price:120000,industry:'technology',volume:1000}]
const list={success:true,data:stocks,pagination:{page:1,pageSize:25,total:1,totalPages:1}}
test('searches positions without accents and keeps query across status filters', async ({ page }) => {
  await boot(page, [
    { stock_id: 'a', symbol: 'FPT', name: 'Công nghệ FPT', quantity: 10, avg_cost: 100000, market_price: 120000 },
    { stock_id: 'b', symbol: 'HPG', name: 'Hòa Phát', quantity: 5, avg_cost: 20000, market_price: 25000 }
  ], [], [{ stock_id: 'c', symbol: 'HPG', name: 'Hòa Phát', realized_pnl: 1000 }])
  const region = page.locator('.portfolio-positions')
  const search = region.getByRole('searchbox')
  await expect(region.locator('tbody tr')).toHaveCount(2)
  await search.fill('hoa phat')
  await expect(region.locator('tbody tr')).toHaveCount(1)
  await expect(region.locator('tbody')).toContainText('HPG')
  await region.getByRole('button', { name: /Đã đóng/ }).click()
  await expect(search).toHaveValue('hoa phat')
  await expect(region.locator('tbody tr')).toHaveCount(1)
  await search.fill('missing')
  await expect(region.getByText(/Không có vị thế phù hợp/)).toBeVisible()
  await expect(region.getByText('Chưa có vị thế đã đóng', { exact: true })).toHaveCount(0)
  await region.getByRole('button', { name: 'Xóa tìm kiếm' }).click()
  await expect(search).toBeFocused()
  await expect(region.locator('tbody tr')).toHaveCount(1)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(search).toBeVisible()
  expect(await region.locator('.position-search-toolbar').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
})

test('uses the same search field format for positions and Watchlist', async ({ page }) => {
  await boot(page, [{ stock_id: 'a', symbol: 'FPT', name: 'Công nghệ FPT', quantity: 10 }], [], [], [{ stock_id: 'a', Stock: { id: 'a', code: 'FPT', name: 'Công nghệ FPT' } }])
  const positionSearch = page.getByLabel('Tìm vị thế theo mã hoặc tên doanh nghiệp')
  const watchlistSearch = page.getByLabel('Tìm trong Watchlist')
  for (const search of [positionSearch, watchlistSearch]) {
    await expect(search).toHaveCSS('min-height', '42px')
    await expect(search).toHaveCSS('border-radius', '11px')
    await expect(search).toHaveCSS('padding-left', '40px')
    expect(await search.evaluate(element => getComputedStyle(element).backgroundImage)).not.toBe('none')
  }
  await watchlistSearch.fill('FPT')
  await expect(page.locator('.watchlist-search .search-result-count')).toHaveText('1/1 mã hiển thị')
  await page.getByRole('button', { name: 'Xóa tìm kiếm' }).last().click()
  await expect(watchlistSearch).toBeFocused()
})
async function boot(page,initialPositions=[],initialTransactions=[],initialClosedPositions=[],initialWatch=[]){
  let watch=initialWatch;let positions=initialPositions;let transactions=initialTransactions;let closedPositions=initialClosedPositions;let transactionBody=null;const imports=[];const mutations=[]
  await page.route('**/api/**',async route=>{
    const req=route.request();const path=new URL(req.url()).pathname;let payload
    if(path==='/api/stocks')payload=list
    else if(path==='/api/stocks/quotes')payload={success:true,data:Object.fromEntries((positions||[]).map(item=>[item.symbol,{price:130000,volume:1000,change:2,volume_type:'session',observed_at:'2026-09-22T10:00:00+07:00',fetched_at:'2026-09-22T03:00:01Z',upstream:'VCI'}]))}
    else if(path==='/api/health')payload={success:true,data:{status:'ok'}}
    else if(path==='/api/cache/stats')payload={success:true,data:{totalEntries:1}}
    else if(path==='/api/ai-gate')payload={success:true,data:{enabled:false,reasons:[]}}
    else if(path==='/api/recommendations/latest')payload={success:true,data:{recommendations:[]}}
    else if(path==='/api/recommendations/history')payload={success:true,data:[]}
    else if(path==='/api/recommendations/readiness')payload={success:true,data:{coverage:[]}}
    else if(path==='/api/auth/me')payload={success:true,user:{id:'e2e',email:'e2e@example.com',role:'admin'}}
    else if(path==='/api/watchlist'&&req.method()==='GET')payload={success:true,data:watch}
    else if(path==='/api/watchlist'&&req.method()==='POST'){watch=[{stock_id:'a',Stock:{code:'FPT',name:'FPT Corp'}}];payload={success:true,data:watch}}
    else if(path.startsWith('/api/watchlist/')&&req.method()==='DELETE'){const code=decodeURIComponent(path.split('/').at(-1));watch=watch.filter(item=>item.Stock?.code!==code);return route.fulfill({status:204})}
    else if(path==='/api/portfolio'&&req.method()==='GET')payload={success:true,data:{positions,closed_positions:closedPositions,position_counts:{open:positions.length,closed:closedPositions.length},transactions}}
    else if(path==='/api/portfolio/transactions/import'){
      const body=JSON.parse(req.postData()||'{}');imports.push(body)
      if(!body.dry_run){const rows=body.rows||[];transactions=[...transactions,...rows.map((row,index)=>({id:`import-${index}`,stock_id:'a',symbol:row.symbol,name:'FPT Corp',side:row.side,quantity:Number(row.quantity),price:Number(row.price),fees:Number(row.fees||0),traded_at:row.traded_at,source:'manual'}))];positions=[{stock_id:'a',symbol:'FPT',quantity:10,market_price:120000,avg_cost:120000,unrealized_pnl:0}]}
      const errors=(body.rows||[]).filter(row=>row.symbol==='AAA').map(row=>({row:row.row_number,field:'symbol',message:'Không tìm thấy mã AAA'}));payload={success:true,data:{valid:errors.length===0,dry_run:body.dry_run,row_count:(body.rows||[]).length,errors}}
    }
    else if(path.startsWith('/api/portfolio/transactions/')&&req.method()==='PUT'){
      const id=decodeURIComponent(path.split('/').at(-1));const body=JSON.parse(req.postData()||'{}');mutations.push({method:'PUT',id,body});transactions=transactions.map(item=>item.id===id?{...item,...body,quantity:Number(body.quantity),price:Number(body.price),fees:Number(body.fees||0)}:item);payload={success:true,data:transactions.find(item=>item.id===id)}
    }
    else if(path.startsWith('/api/portfolio/transactions/')&&req.method()==='DELETE'){
      const id=decodeURIComponent(path.split('/').at(-1));const body=JSON.parse(req.postData()||'{}');mutations.push({method:'DELETE',id,body});transactions=transactions.filter(item=>item.id!==id);payload={success:true,data:{id}}
    }
    else if(path==='/api/portfolio/transactions'){transactionBody=JSON.parse(req.postData()||'{}');positions=[{stock_id:'a',symbol:'FPT',quantity:Number(transactionBody.quantity),market_price:Number(transactionBody.price),avg_cost:Number(transactionBody.price),unrealized_pnl:0}];transactions=[...transactions,{id:'created',stock_id:'a',symbol:'FPT',name:'FPT Corp',side:transactionBody.side,quantity:Number(transactionBody.quantity),price:Number(transactionBody.price),fees:0,traded_at:'2026-10-01T03:00:00Z',source:'manual'}];payload={success:true,data:{positions}}}
    else payload={success:true,data:null}
    await route.fulfill({json:payload})
  })
  await page.goto('/');await expect(page.locator('.dashboard-shell')).toBeVisible();await page.getByRole('button',{name:'Danh mục cá nhân',exact:true}).click();return {getTransaction:()=>transactionBody,getImports:()=>imports,getMutations:()=>mutations}
}
test('records a historical transaction and refreshes positions',async({page})=>{const state=await boot(page);const fields=page.locator('.transaction-form input');await fields.nth(0).fill('FPT');await fields.nth(1).fill('10');await fields.nth(2).fill('120000');await page.locator('.transaction-form button[type=submit]').click();await expect.poll(()=>state.getTransaction()).toMatchObject({symbol:'FPT',quantity:'10',price:'120000'});const row=page.locator('.portfolio-table tbody tr');await expect(row).toContainText('FPT');await expect(row).toHaveClass(/portfolio-row-clickable/);await row.hover();await expect(row).toHaveCSS('cursor','pointer');await row.click();await expect(page.getByRole('button',{name:'Chi tiết mã',exact:true})).toHaveClass(/active/)})
test('shows cost basis and realized versus unrealized P/L separately',async({page})=>{await boot(page);await expect(page.locator('.portfolio-table thead th')).toHaveCount(6);await expect(page.locator('.portfolio-table thead')).toContainText('Giá vốn');await expect(page.locator('.portfolio-table thead')).toContainText('Lãi/lỗ');})
test('filters open and fully closed positions without mixing their metrics',async({page})=>{await boot(page,[{stock_id:'a',symbol:'FPT',quantity:10,market_price:120000,avg_cost:100000,unrealized_pnl:200000,realized_pnl:0}],[],[{stock_id:'b',symbol:'VCB',name:'Vietcombank',status:'closed',quantity:0,realized_pnl:150000,closed_at:'2026-09-30T03:00:00Z'}]);const positions=page.locator('.portfolio-positions');await expect(positions.getByRole('button',{name:'Đang mở 1'})).toHaveAttribute('aria-pressed','true');await expect(positions.getByRole('table',{name:'Vị thế đang mở'})).toContainText('FPT');await positions.getByRole('button',{name:'Đã đóng 1'}).click();await expect(positions.getByRole('button',{name:'Đã đóng 1'})).toHaveAttribute('aria-pressed','true');const closed=positions.getByRole('table',{name:'Vị thế đã đóng'});await expect(closed).toContainText('VCB');await expect(closed).toContainText('Đã đóng');await expect(closed).toContainText('150.000');await expect(closed).not.toContainText('Giá hiện tại')})
test('adds a symbol to watchlist through the tracking form',async({page})=>{await boot(page);const input=page.getByLabel('Thêm mã theo dõi');await input.fill('FPT');await page.locator('.watchlist-panel button.primary-btn').click();await expect(page.locator('.watchlist li')).toContainText('FPT')})

test('searches watchlist and separates opening from confirmed removal',async({page})=>{await boot(page,[],[],[],[{stock_id:'a',Stock:{id:'a',code:'FPT',name:'Công nghệ FPT'}},{stock_id:'b',Stock:{id:'b',code:'HPG',name:'Hòa Phát'}}]);const panel=page.locator('.watchlist-panel');const search=panel.getByLabel('Tìm trong Watchlist');await search.fill('hoa phat');await expect(panel.locator('.watchlist li')).toHaveCount(1);await expect(panel.locator('.watchlist li')).toContainText('HPG');await panel.getByRole('button',{name:'Xóa HPG khỏi Watchlist'}).click();await expect(panel.getByRole('group',{name:'Xác nhận xóa HPG'})).toBeVisible();await panel.getByRole('button',{name:'Hủy'}).click();await expect(panel.locator('.watchlist li')).toHaveCount(1);await panel.getByRole('button',{name:'Xóa HPG khỏi Watchlist'}).click();await panel.getByRole('button',{name:'Xác nhận xóa'}).click();await expect(panel.getByText(/Không có mã phù hợp/)).toBeVisible();await panel.getByRole('button',{name:'Xóa tìm kiếm'}).click();await expect(search).toBeFocused();await expect(panel.locator('.watchlist li')).toHaveCount(1);await panel.getByRole('button',{name:'Mở chi tiết'}).click();await expect(page.getByRole('button',{name:'Chi tiết mã',exact:true})).toHaveClass(/active/);})

test('blocks duplicate watchlist mutations and keeps recoverable failures local', async ({ page }) => {
  await boot(page, [], [], [], [{ stock_id: 'b', Stock: { id: 'b', code: 'HPG', name: 'Hòa Phát' } }])
  const panel = page.locator('.watchlist-panel')
  let postCount = 0
  await page.route('**/api/watchlist', async route => {
    if (route.request().method() !== 'POST') return route.fallback()
    postCount += 1
    await new Promise(resolve => setTimeout(resolve, 150))
    return route.fulfill({ status: 503, json: { success: false, message: 'Watchlist đang tạm gián đoạn.' } })
  })
  const addInput = panel.getByLabel('Thêm mã theo dõi')
  await addInput.fill('FPT')
  const addButton = panel.getByRole('button', { name: 'Thêm mã' })
  await addButton.evaluate(button => { button.click(); button.click() })
  await expect(panel.getByRole('button', { name: 'Đang thêm FPT…' })).toBeDisabled()
  await expect(panel.getByRole('alert')).toContainText('Watchlist đang tạm gián đoạn.')
  expect(postCount).toBe(1)
  await expect(addInput).toHaveValue('FPT')

  await page.route('**/api/watchlist/HPG', route => route.fulfill({ status: 503, json: { success: false, message: 'Chưa thể xóa HPG.' } }))
  await panel.getByRole('button', { name: 'Xóa HPG khỏi Watchlist' }).click()
  await panel.getByRole('button', { name: 'Xác nhận xóa' }).click()
  await expect(panel.getByRole('alert')).toContainText('Chưa thể xóa HPG.')
  await expect(panel.getByRole('group', { name: 'Xác nhận xóa HPG' })).toBeVisible()
  await expect(panel.locator('.watchlist li')).toContainText('HPG')
})

test('renders the transaction ledger and exports all rows to CSV',async({page})=>{await boot(page,[],[{id:'tx-1',stock_id:'a',symbol:'FPT',name:'FPT Corp',side:'BUY',quantity:10,price:120000,fees:1500,traded_at:'2026-10-01T03:00:00Z',source:'manual'}]);const panel=page.locator('.portfolio-ledger-panel');await expect(panel).toBeVisible();await expect(panel.locator('tbody tr')).toHaveCount(1);await expect(panel.locator('tbody tr')).toContainText('FPT');await expect(panel.locator('tbody tr')).toContainText('120.000');const downloadPromise=page.waitForEvent('download');await panel.getByRole('button',{name:'Xuất CSV'}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/^stockpilot-ledger-\d{4}-\d{2}-\d{2}\.csv$/)})

test('previews then atomically imports a valid ledger CSV',async({page})=>{const state=await boot(page);const panel=page.locator('.portfolio-ledger-panel');await panel.locator('input[type=file]').setInputFiles({name:'ledger.csv',mimeType:'text/csv',buffer:Buffer.from('Mã,Loại,Số lượng,Giá,Phí,Thời điểm giao dịch\nFPT,Mua,10,120000,1000,2026-10-01T03:00:00.000Z')});await expect(panel.locator('.portfolio-import-status')).toContainText('Sẵn sàng nhập');await expect.poll(()=>state.getImports().length).toBe(1);expect(state.getImports()[0].dry_run).toBe(true);await panel.getByRole('button',{name:'Nhập 1 giao dịch'}).click();await expect(panel.locator('.portfolio-import-status')).toContainText('Đã nhập 1 giao dịch');await expect(panel.locator('tbody tr')).toContainText('FPT');await expect.poll(()=>state.getImports().length).toBe(2);expect(state.getImports()[1].dry_run).toBe(false)})

test('shows row errors from CSV preview and keeps commit disabled',async({page})=>{const state=await boot(page);const panel=page.locator('.portfolio-ledger-panel');await panel.locator('input[type=file]').setInputFiles({name:'invalid.csv',mimeType:'text/csv',buffer:Buffer.from('Mã,Loại,Số lượng,Giá,Thời điểm giao dịch\nAAA,Mua,10,120000,2026-10-01T03:00:00.000Z')});const status=panel.locator('.portfolio-import-status');await expect(status).toContainText('Chưa thể nhập');await expect(status).toContainText('Dòng 2');await expect(status).toContainText('Không tìm thấy mã AAA');await expect(panel.getByRole('button',{name:'Nhập 1 giao dịch'})).toBeDisabled();expect(state.getImports()).toHaveLength(1)})

test('edits a ledger transaction only after explicit confirmation',async({page})=>{const state=await boot(page,[],[{id:'tx-1',stock_id:'a',symbol:'FPT',name:'FPT Corp',side:'BUY',quantity:10,price:120000,fees:1500,traded_at:'2026-10-01T03:00:00Z',source:'manual'}]);const panel=page.locator('.portfolio-ledger-panel');await panel.getByRole('button',{name:'Sửa'}).click();const dialog=page.getByRole('dialog',{name:/Sửa giao dịch FPT/});await expect(dialog).toBeVisible();await expect(dialog.locator('input').first()).toHaveCSS('background-color','rgb(23, 36, 58)');await dialog.getByLabel('Số lượng').fill('12');await dialog.getByRole('button',{name:'Xác nhận sửa'}).click();await expect(dialog).toHaveCount(0);await expect(panel.locator('tbody tr')).toContainText('12');await expect(panel.getByRole('status')).toHaveText('Đã sửa giao dịch.');await expect.poll(()=>state.getMutations()).toHaveLength(1);expect(state.getMutations()[0]).toMatchObject({method:'PUT',id:'tx-1',body:{side:'BUY',quantity:'12',price:'120000',fees:'1500'}})})

test('deletes a ledger transaction only after confirmation and sends the confirmation flag',async({page})=>{const state=await boot(page,[],[{id:'tx-1',stock_id:'a',symbol:'FPT',name:'FPT Corp',side:'BUY',quantity:10,price:120000,fees:0,traded_at:'2026-10-01T03:00:00Z',source:'manual'}]);const panel=page.locator('.portfolio-ledger-panel');await panel.getByRole('button',{name:'Xóa'}).click();const dialog=page.getByRole('dialog',{name:'Xác nhận xóa giao dịch'});await expect(dialog).toContainText('Mua 10 FPT');await dialog.getByRole('button',{name:'Hủy'}).click();await expect(panel.locator('tbody tr')).toHaveCount(1);expect(state.getMutations()).toHaveLength(0);await panel.getByRole('button',{name:'Xóa'}).click();await page.getByRole('dialog',{name:'Xác nhận xóa giao dịch'}).getByRole('button',{name:'Xác nhận xóa'}).click();await expect(panel.locator('.portfolio-ledger-empty')).toBeVisible();await expect(panel.getByRole('status')).toHaveText('Đã xóa giao dịch.');await expect(page.locator('.portfolio-panel').getByText('Đã xóa giao dịch.')).toHaveCount(0);expect(state.getMutations()).toEqual([{method:'DELETE',id:'tx-1',body:{confirmed:true}}])})

test('shows stock weight tooltip across the donut shell on hover and keyboard focus',async({page})=>{await boot(page,[{stock_id:'a',symbol:'FPT',quantity:10,market_price:120000,avg_cost:100000,unrealized_pnl:200000,realized_pnl:0},{stock_id:'b',symbol:'VCB',quantity:5,market_price:80000,avg_cost:70000,unrealized_pnl:50000,realized_pnl:0}]);const donut=page.locator('.allocation-donut');const fptSlice=page.locator('.allocation-donut-interaction-svg path[data-symbol="FPT"]');const vcbSlice=page.locator('.allocation-donut-interaction-svg path[data-symbol="VCB"]');const tooltip=page.locator('.allocation-donut-tooltip');await expect(fptSlice).toHaveAttribute('aria-label',/FPT: 66\.7%/);await expect(vcbSlice).toHaveAttribute('aria-label',/VCB: 33\.3%/);await expect(page.locator('.page-loading-overlay')).toHaveCount(0);const box=await donut.boundingBox();expect(box).not.toBeNull();await page.mouse.move(box.x+box.width-10,box.y+box.height/2);await expect(tooltip).toBeVisible();await expect(tooltip).toContainText('FPT');await expect(tooltip).toContainText('66.7%');await expect(tooltip).toContainText('1.300.000');await vcbSlice.focus();await expect(tooltip).toBeVisible();await expect(tooltip).toContainText('VCB');await expect(tooltip).toContainText('33.3%')})

test('shows positive day change with a white label and green signed value',async({page})=>{await boot(page,[{stock_id:'a',symbol:'FPT',quantity:10,market_price:120000,previous_market_price:120000,avg_cost:100000,unrealized_pnl:200000,realized_pnl:0}]);await expect(page.locator('.portfolio-table tbody tr')).toContainText('130.000');const change=page.locator('.allocation-day-change');const value=change.locator('span');await expect(change).toContainText('So với hôm qua:');await expect(value).toHaveText('+100.000 ₫ +8,33%');await expect(change).toHaveAttribute('data-rag','green');await expect(change).toHaveCSS('color','rgb(248, 250, 252)');await expect(value).toHaveCSS('color','rgb(52, 211, 153)')})

test('shows negative day change in red with explicit minus signs',async({page})=>{await boot(page,[{stock_id:'a',symbol:'FPT',quantity:10,market_price:120000,previous_market_price:140000,avg_cost:100000,unrealized_pnl:200000,realized_pnl:0}]);await expect(page.locator('.portfolio-table tbody tr')).toContainText('130.000');const change=page.locator('.allocation-day-change');const value=change.locator('span');await expect(value).toHaveText('-100.000 ₫ -7,14%');await expect(change).toHaveAttribute('data-rag','red');await expect(value).toHaveCSS('color','rgb(248, 113, 113)')})

test('revalues positions and allocation from the newest intraday quote',async({page})=>{await boot(page,[{stock_id:'a',symbol:'FPT',quantity:10,market_price:120000,avg_cost:100000,unrealized_pnl:200000,realized_pnl:0}]);await expect(page.locator('.portfolio-table tbody tr')).toContainText('130.000');await expect(page.locator('.portfolio-table tbody tr')).toContainText('300.000');await expect(page.locator('.portfolio-table tbody tr')).toContainText('Intraday');await expect(page.locator('.allocation-donut')).toBeVisible();await expect(page.locator('.allocation-donut')).toContainText('1.300.000');await expect(page.locator('.allocation-list')).toContainText('100.0%');await expect(page.locator('.portfolio-data-audit')).toContainText('Kiểm tra dữ liệu danh mục')})
