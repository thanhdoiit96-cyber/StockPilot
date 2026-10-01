const frontendBase = process.env.FRONTEND_URL || 'http://127.0.0.1:4180'
const backendBase = process.env.BACKEND_URL || 'http://127.0.0.1:5000'
const htmlResponse = await fetch(`${frontendBase}/`)
if (!htmlResponse.ok) throw new Error(`Preview HTTP ${htmlResponse.status}`)
const html = await htmlResponse.text()
const asset = html.match(/<script type="module" crossorigin src="\/assets\/([^"']+\.js)"/)?.[1]
if (!asset) throw new Error('Preview JavaScript asset missing')
const assetResponse = await fetch(`${frontendBase}/assets/${asset}`)
if (!assetResponse.ok) throw new Error(`Asset HTTP ${assetResponse.status}`)
const bundle = await assetResponse.text()
for (const marker of ['expert-guidance-panel', 'advanced-indicator-grid', 'analysis-empty-state']) {
  if (!bundle.includes(marker)) throw new Error(`Bundle marker missing: ${marker}`)
}
if (!bundle.includes('analysis-requested:')) throw new Error('Analysis restore marker missing')
const stocksResponse = await fetch(`${backendBase}/api/stocks?pageSize=1`)
if (!stocksResponse.ok) throw new Error(`Stock API HTTP ${stocksResponse.status}`)
const stocks = await stocksResponse.json()
const stockId = stocks.data?.[0]?.id
if (!stockId) throw new Error('Stock API returned no symbol')
const analysisUrl = `${backendBase}/api/stocks/${encodeURIComponent(stockId)}/analysis`
const analysisResponse = await fetch(analysisUrl)
if (!analysisResponse.ok) throw new Error(`Analysis API HTTP ${analysisResponse.status}`)
const analysis = await analysisResponse.json()
const expert = analysis.data?.expert_guidance
if (!analysis.success || !expert || !Array.isArray(expert.score_breakdown) || !analysis.data.indicators?.macd || !analysis.data.indicators?.bollinger || !analysis.data.indicators?.ichimoku) throw new Error('Analysis payload missing expert guidance or indicators')
const cachedResponse = await fetch(analysisUrl)
if (!cachedResponse.ok) throw new Error(`Cache request HTTP ${cachedResponse.status}`)
const cached = await cachedResponse.json()
if (!cached.success || !cached.data?.expert_guidance) throw new Error('Cache response missing expert guidance')
const refreshResponse = await fetch(`${analysisUrl}?refresh=1`)
if (!refreshResponse.ok) throw new Error(`Refresh request HTTP ${refreshResponse.status}`)
const refreshed = await refreshResponse.json()
if (!refreshed.success || refreshed.source === 'cache' || !refreshed.data?.expert_guidance) throw new Error('Refresh did not bypass cache')
console.log(`Live analysis verification passed: ${asset}; ${stockId}; ${expert.score_breakdown.length} score factors`)
