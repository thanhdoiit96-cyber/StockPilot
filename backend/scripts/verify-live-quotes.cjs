const fs = require('fs');
const path = require('path');

(async () => {
  const base = process.env.QUOTE_VERIFY_URL || 'http://127.0.0.1:4173';
  const get = async url => {
    const response = await fetch(`${base}${url}`, { signal: AbortSignal.timeout(45000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  };
  const list = await get('/api/stocks?pageSize=200&sort=code');
  const symbols = list.data.map(stock => stock.code);
  const started = Date.now();
  const quotes = {};
  const errors = [];
  let offset = 0;
  const run = async () => {
    while (offset < symbols.length) {
      const batch = symbols.slice(offset, offset + 200);
      offset += 200;
      try { Object.assign(quotes, (await get(`/api/stocks/quotes?symbols=${batch.join(',')}`)).data); }
      catch (error) { errors.push({ symbols: batch, message: error.message }); }
    }
  };
  await run();
  const workerUrl = process.env.QUOTE_WORKER_URL || 'http://127.0.0.1:8787';
  const missingBeforeProviderProbe = symbols.filter(symbol => !quotes[symbol]);
  const probeSymbols = [...new Set(['FPT', ...missingBeforeProviderProbe])];
  let providerProbe;
  try {
    const response = await fetch(`${workerUrl}/price-board`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ symbols: probeSymbols, source: 'VCI', mode: 'price-board' }), signal: AbortSignal.timeout(30000) });
    const payload = await response.json();
    const providerSymbols = [...new Set((payload.rows || []).filter(row => Number(row.price) > 0).map(row => String(row.symbol || '').toUpperCase()))];
    providerProbe = { url: workerUrl, status: response.status, requested: probeSymbols.length, returned: providerSymbols.length,
      unresolved_missing: missingBeforeProviderProbe.filter(symbol => !providerSymbols.includes(symbol)),
      rows: payload.rows?.length || 0, errors: payload.errors || [], sample: payload.rows?.find(row => row.symbol === 'FPT') || payload.rows?.[0] || null };
  } catch (error) { providerProbe = { url: workerUrl, error: error.message }; }
  const checkedAt = new Date();
  const ages = Object.values(quotes).map(quote => Math.max(0, checkedAt.getTime() - Date.parse(quote.observed_at)));
  const localParts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(checkedAt).map(part => [part.type, part.value]));
  const minuteOfDay = Number(localParts.hour) * 60 + Number(localParts.minute);
  const weekday = !['Sat', 'Sun'].includes(localParts.weekday);
  const marketPhase = !weekday ? 'weekend' : minuteOfDay >= 540 && minuteOfDay < 690 ? 'morning_session'
    : minuteOfDay >= 690 && minuteOfDay < 780 ? 'lunch_break' : minuteOfDay >= 780 && minuteOfDay < 900
      ? 'afternoon_session' : 'outside_regular_hours';
  const regularSessionOpen = ['morning_session', 'afternoon_session'].includes(marketPhase);
  let listingProbe;
  try {
    const response = await fetch(`${workerUrl}/listing`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source: 'VCI' }), signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const listed = new Map((payload.rows || []).map(row => [String(row.symbol || '').toUpperCase(), row]));
    const universeListing = symbols.map(symbol => {
      const row = listed.get(symbol);
      const status = !row ? 'unknown' : String(row.exchange || '').toUpperCase() === 'DELISTED' ? 'delisted' : 'listed';
      return { symbol, status, exchange: row?.exchange || null, type: row?.type || null };
    });
    const statusGroups = Object.fromEntries(['listed', 'delisted', 'unknown'].map(status => {
      const members = universeListing.filter(item => item.status === status);
      const quoted = members.filter(item => quotes[item.symbol]).length;
      return [status, { total: members.length, quoted, missing: members.length - quoted,
        coverage_pct: members.length ? Number((quoted / members.length * 100).toFixed(1)) : null }];
    }));
    listingProbe = { status: response.status, listing_count: listed.size,
      universe_listing_status: statusGroups,
      universe_symbols: universeListing,
      missing_symbols_present_in_listing: missingBeforeProviderProbe.filter(symbol => listed.has(symbol)),
      missing_symbols_absent_from_listing: missingBeforeProviderProbe.filter(symbol => !listed.has(symbol)),
      missing_symbol_metadata: missingBeforeProviderProbe.filter(symbol => listed.has(symbol)).map(symbol => ({ symbol, name: listed.get(symbol).name, exchange: listed.get(symbol).exchange, type: listed.get(symbol).type })) };
  } catch (error) { listingProbe = { error: error.message }; }
  const freshness = {
    under_1m: ages.filter(age => age < 60_000).length,
    under_5m: ages.filter(age => age < 5 * 60_000).length,
    under_15m: ages.filter(age => age < 15 * 60_000).length,
    over_15m: ages.filter(age => age >= 15 * 60_000).length,
    stale_over_15m_during_regular_session: regularSessionOpen ? ages.filter(age => age >= 15 * 60_000).length : null,
    median_age_ms: ages.length ? ages.sort((a, b) => a - b)[Math.floor(ages.length / 2)] : null
  };
  const evidence = { checked_at: checkedAt.toISOString(), base, total: list.pagination.total, listed: symbols.length,
    quote_count: Object.keys(quotes).length, coverage_pct: Number((Object.keys(quotes).length / symbols.length * 100).toFixed(1)),
    market_phase: marketPhase, freshness, provider_probe: providerProbe, listing_probe: listingProbe, duration_ms: Date.now() - started,
    missing: symbols.filter(symbol => !quotes[symbol]), stale_symbols: Object.values(quotes)
      .filter(quote => regularSessionOpen && checkedAt.getTime() - Date.parse(quote.observed_at) >= 15 * 60_000)
      .map(quote => ({ symbol: quote.symbol, observed_at: quote.observed_at })), errors, quotes };
  const stamp = checkedAt.toISOString().replace(/[:.]/g, '-');
  const file = path.resolve(__dirname, `../evidence/live-quotes-${stamp}.json`);
  evidence.evidence_file = path.basename(file);
  fs.writeFileSync(file, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ ...evidence, quotes: { FPT: quotes.FPT, VCB: quotes.VCB, MWG: quotes.MWG } }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
