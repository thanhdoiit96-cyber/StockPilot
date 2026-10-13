'use strict';

const VERSION = 'company_capital_v1';
const text = value => value == null || String(value).trim() === '' ? null : String(value).trim();
const number = value => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
const pick = (row, keys) => keys.map(key => row?.[key]).find(value => value != null && String(value).trim() !== '');

const normalizeCapital = row => ({
  date: text(pick(row, ['date', 'issue_date', 'effective_date', 'report_date'])),
  charter_capital: number(pick(row, ['charter_capital', 'capital', 'charter_capital_value'])),
  issued_shares: number(pick(row, ['issued_share', 'issued_shares', 'shares'])),
  change_pct: number(pick(row, ['change_percent', 'change_pct', 'percent_change']))
});

const normalizeEvent = row => ({
  date: text(pick(row, ['event_date', 'date', 'record_date', 'ex_right_date', 'effective_date'])),
  title: text(pick(row, ['event_name', 'event_title', 'title', 'event'])),
  type: text(pick(row, ['event_type', 'type', 'category'])),
  value: text(pick(row, ['value', 'event_value', 'ratio', 'cash_dividend'])),
  description: text(pick(row, ['description', 'content', 'note']))
});

function normalizeCompanyCapital({ symbol, providerPayload = null, fetchedAt = new Date() }) {
  const capital_history = (providerPayload?.capital_history || []).map(normalizeCapital).filter(item => item.date || item.charter_capital != null || item.issued_shares != null).slice(0, 20);
  const events = (providerPayload?.events || []).map(normalizeEvent).filter(item => item.date || item.title).slice(0, 30);
  const errors = Array.isArray(providerPayload?.errors) ? providerPayload.errors : [];
  const provider = text(providerPayload?.provider);
  return {
    version: VERSION, symbol:text(symbol)?.toUpperCase(),
    status: capital_history.length || events.length ? (errors.length ? 'partial' : 'available') : 'unavailable',
    capital_history, events,
    summary:{ capital_records:capital_history.length, event_records:events.length },
    semantics:{ provider_events_are_disclosures:true, portfolio_effect_requires_confirmed_ledger_event:true },
    provenance:{ provider:provider || null, route:text(providerPayload?.route) || 'company.capital_history+events', fetched_at:fetchedAt.toISOString(), license_status:provider ? 'provider_terms_apply' : 'provider_unavailable' },
    limitations:errors.map(item => text(item?.scope || item?.error)).filter(Boolean)
  };
}

async function fetchCompanyCapital(symbol, { fetchImpl=fetch, workerUrl=process.env.VNSTOCK_WORKER_URL || 'http://127.0.0.1:8787', timeoutMs=Number(process.env.VNSTOCK_COMPANY_CAPITAL_TIMEOUT_MS || 10000) }={}) {
  const response = await fetchImpl(`${workerUrl.replace(/\/$/, '')}/company-capital`, { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ symbol:String(symbol || '').trim().toUpperCase(), source:'kbs' }), signal:AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`company capital worker HTTP ${response.status}`);
  return response.json();
}

module.exports = { VERSION, normalizeCompanyCapital, fetchCompanyCapital };
