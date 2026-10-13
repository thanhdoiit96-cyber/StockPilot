'use strict';

const VERSION = 'company_people_v1';
const text = value => value == null || String(value).trim() === '' ? null : String(value).trim();
const number = value => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
const pick = (row, keys) => keys.map(key => row?.[key]).find(value => value != null && String(value).trim() !== '');

function normalizeShareholder(row) {
  return {
    name: text(pick(row, ['share_holder', 'shareholder_name', 'name', 'owner_name'])),
    ownership_pct: number(pick(row, ['share_own_percent', 'ownership_percent', 'ownership_pct', 'percent'])),
    shares: number(pick(row, ['share_own', 'shares', 'share_quantity', 'quantity'])),
    updated_at: text(pick(row, ['update_date', 'updated_at', 'report_date', 'date']))
  };
}

function normalizeOfficer(row) {
  return {
    name: text(pick(row, ['officer_name', 'name', 'full_name'])),
    position: text(pick(row, ['officer_position', 'position', 'title'])),
    ownership_pct: number(pick(row, ['officer_own_percent', 'ownership_percent', 'ownership_pct', 'percent'])),
    shares: number(pick(row, ['officer_own', 'shares', 'share_quantity', 'quantity']))
  };
}

function normalizeCompanyPeople({ symbol, providerPayload = null, fetchedAt = new Date() }) {
  const shareholders = (providerPayload?.shareholders || []).map(normalizeShareholder).filter(item => item.name).slice(0, 20);
  const officers = (providerPayload?.officers || []).map(normalizeOfficer).filter(item => item.name).slice(0, 20);
  const errors = Array.isArray(providerPayload?.errors) ? providerPayload.errors : [];
  const provider = text(providerPayload?.provider);
  return {
    version: VERSION,
    symbol: text(symbol)?.toUpperCase(),
    status: shareholders.length || officers.length ? (errors.length ? 'partial' : 'available') : 'unavailable',
    shareholders,
    officers,
    summary: { shareholder_count: shareholders.length, officer_count: officers.length },
    provenance: {
      provider: provider || null,
      route: text(providerPayload?.route) || 'company.shareholders+officers',
      fetched_at: fetchedAt.toISOString(),
      license_status: provider ? 'provider_terms_apply' : 'provider_unavailable'
    },
    limitations: errors.map(item => text(item?.scope || item?.error)).filter(Boolean)
  };
}

async function fetchCompanyPeople(symbol, { fetchImpl = fetch, workerUrl = process.env.VNSTOCK_WORKER_URL || 'http://127.0.0.1:8787', timeoutMs = Number(process.env.VNSTOCK_COMPANY_PEOPLE_TIMEOUT_MS || 10000) } = {}) {
  const response = await fetchImpl(`${workerUrl.replace(/\/$/, '')}/company-people`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ symbol:String(symbol || '').trim().toUpperCase(), source:'kbs' }),
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) throw new Error(`company people worker HTTP ${response.status}`);
  return response.json();
}

module.exports = { VERSION, normalizeCompanyPeople, fetchCompanyPeople };
