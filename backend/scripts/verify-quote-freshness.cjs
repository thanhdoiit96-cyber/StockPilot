'use strict';

const fs = require('node:fs');
const path = require('node:path');

function marketPhaseAt(date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).map(part => [part.type, part.value]));
  const minute = Number(parts.hour) * 60 + Number(parts.minute);
  if (['Sat', 'Sun'].includes(parts.weekday)) return 'weekend';
  if (minute >= 540 && minute < 690) return 'morning_session';
  if (minute >= 690 && minute < 780) return 'lunch_break';
  if (minute >= 780 && minute < 900) return 'afternoon_session';
  return 'outside_regular_hours';
}

function vietnamSessionDate(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}

async function runQuoteFreshnessProbe({ base = process.env.QUOTE_API_URL || 'http://127.0.0.1:5000', symbols: requestedSymbols, fetchImpl = fetch, now = () => new Date(), writeEvidence = true } = {}) {
  base = base.replace(/\/$/, '');
  const symbols = [...new Set((requestedSymbols || process.env.QUOTE_PROBE_SYMBOLS || 'FPT,SSI,VCB,HPG,BSR')
    .split(',').map(symbol => symbol.trim().toUpperCase()).filter(symbol => /^[A-Z0-9]{1,10}$/.test(symbol)))];
  if (!symbols.length || symbols.length > 30) throw new Error('QUOTE_PROBE_SYMBOLS must contain between 1 and 30 valid symbols');

  let httpStatus = null;
  let payload = null;
  let error = null;
  try {
    const response = await fetchImpl(`${base}/api/stocks/quotes?symbols=${symbols.join(',')}`, { signal: AbortSignal.timeout(30000) });
    httpStatus = response.status;
    payload = await response.json();
    if (!response.ok || payload.success === false) error = payload.message || `HTTP ${response.status}`;
  } catch (cause) { error = cause.message; }

  const checkedAt = now();
  const phase = marketPhaseAt(checkedAt);
  const quotes = payload?.data || {};
  const observations = Object.entries(quotes).map(([symbol, quote]) => ({
    symbol,
    price: quote.price,
    upstream: quote.upstream || quote.provider || null,
    observed_at: quote.observed_at || null,
    fetched_at: quote.fetched_at || null,
    age_seconds: quote.observed_at && Number.isFinite(Date.parse(quote.observed_at))
      ? Math.max(0, Math.round((checkedAt.getTime() - Date.parse(quote.observed_at)) / 1000)) : null
  }));
  const ages = observations.map(item => item.age_seconds).filter(Number.isFinite);
  const regularSession = ['morning_session', 'afternoon_session'].includes(phase);
  const sessionDate = vietnamSessionDate(checkedAt);
  const sessionDayConfirmed = observations.some(item => item.observed_at && vietnamSessionDate(new Date(item.observed_at)) === sessionDate);
  const result = {
    checked_at: checkedAt.toISOString(),
    market_phase: phase,
    session_date: sessionDate,
    session_day_confirmed: sessionDayConfirmed,
    api_base: base,
    requested_symbols: symbols,
    http_status: httpStatus,
    returned: observations.length,
    missing: symbols.filter(symbol => !quotes[symbol]),
    observations,
    freshness: regularSession && sessionDayConfirmed ? {
      evaluated_during_regular_session: true,
      session_day_confirmed: true,
      under_1m: ages.filter(age => age < 60).length,
      under_5m: ages.filter(age => age < 300).length,
      under_15m: ages.filter(age => age < 900).length,
      over_15m: ages.filter(age => age >= 900).length
    } : { evaluated_during_regular_session: false, reason: !regularSession
      ? 'Quote age is recorded, but stale-session thresholds are not applied outside regular trading hours.'
      : 'No quote is stamped with the current Vietnam session date; this may be a market holiday or an upstream freshness issue, so stale thresholds are inconclusive.' },
    error
  };
  const stamp = checkedAt.toISOString().replace(/[:.]/g, '-');
  if (writeEvidence) {
    const file = path.resolve(__dirname, `../evidence/quote-freshness-${stamp}.json`);
    result.evidence_file = path.basename(file);
    fs.writeFileSync(file, JSON.stringify(result, null, 2));
  }
  return result;
}

async function main() {
  const result = await runQuoteFreshnessProbe();
  console.log(JSON.stringify(result, null, 2));
  if (result.error) process.exitCode = 1;
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });

module.exports = { marketPhaseAt, vietnamSessionDate, runQuoteFreshnessProbe };
