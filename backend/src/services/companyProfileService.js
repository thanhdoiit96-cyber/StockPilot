'use strict';

const PROFILE_VERSION = 'company_profile_v1';

const text = value => value == null || String(value).trim() === '' ? null : String(value).trim();
const number = value => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);

function normalizeCompanyProfile({ stock, providerPayload = null, fetchedAt = new Date() }) {
  const remote = providerPayload?.profile && typeof providerPayload.profile === 'object' ? providerPayload.profile : {};
  const provider = text(providerPayload?.provider);
  const profile = {
    symbol: text(stock?.code)?.toUpperCase() || text(remote.symbol)?.toUpperCase(),
    name: text(remote.name) || text(stock?.name),
    short_name: text(remote.short_name),
    exchange: text(remote.exchange) || text(stock?.exchange),
    industry: text(remote.sector) || text(remote.industry) || text(stock?.industry),
    description: text(remote.profile) || text(remote.company_profile) || text(remote.history),
    listing_date: text(remote.listing_date),
    founded_date: text(remote.founded_date),
    issued_shares: number(remote.issued_share ?? remote.issued_shares),
    charter_capital: number(remote.charter_capital),
    employees: number(remote.num_employees ?? remote.employees),
    website: text(remote.website),
    address: text(remote.address),
    phone: text(remote.phone),
    email: text(remote.email),
    tax_id: text(remote.tax_id),
    market_cap: number(stock?.market_cap)
  };
  const remoteFields = Object.entries(profile).filter(([key, value]) => !['symbol', 'name', 'exchange', 'industry', 'market_cap'].includes(key) && value != null).length;
  return {
    version: PROFILE_VERSION,
    status: provider && remoteFields ? 'available' : 'partial',
    profile,
    sections: { profile: true, shareholders: false, capital: false, financials: false },
    provenance: {
      provider: provider || 'local_reference',
      route: text(providerPayload?.route),
      fetched_at: fetchedAt.toISOString(),
      license_status: provider ? 'provider_terms_apply' : 'provider_unavailable',
      live_provider_fields: remoteFields
    },
    limitations: provider ? [] : ['provider_profile_unavailable']
  };
}

async function fetchCompanyProfile(symbol, { fetchImpl = fetch, workerUrl = process.env.VNSTOCK_WORKER_URL || 'http://127.0.0.1:8787', timeoutMs = Number(process.env.VNSTOCK_COMPANY_TIMEOUT_MS || 7000) } = {}) {
  const response = await fetchImpl(`${workerUrl.replace(/\/$/, '')}/company-profile`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ symbol: String(symbol || '').trim().toUpperCase(), source: 'vci' }),
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) throw new Error(`company profile worker HTTP ${response.status}`);
  const payload = await response.json();
  if (!payload?.profile || payload?.errors?.length) throw new Error(String(payload?.errors?.[0]?.error || 'company profile unavailable'));
  return payload;
}

module.exports = { PROFILE_VERSION, normalizeCompanyProfile, fetchCompanyProfile };
