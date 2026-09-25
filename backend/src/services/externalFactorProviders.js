'use strict';
const axios = require('axios');
const crypto = require('crypto');
const { normalizeExternalFactor } = require('./externalFactorAdapter');

function hash(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function parseGdeltDate(value) {
  if (!value) return null;
  const text = String(value);
  if (/^\d{14}$/.test(text)) return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}T${text.slice(8, 10)}:${text.slice(10, 12)}:${text.slice(12, 14)}.000Z`;
  const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function createWorldBankMacroAdapter({ http = axios } = {}) {
  return { provider: 'world-bank', license: 'CC BY-4.0', async fetch({ country = 'VNM', indicator = 'FP.CPI.TOTL.ZG', date = '' } = {}) {
    const url = `https://api.worldbank.org/v2/country/${country}/indicator/${indicator}?format=json&per_page=100${date ? `&date=${date}` : ''}`;
    const response = await http.get(url, { timeout: 15000 });
    const rows = Array.isArray(response.data) ? response.data[1] || [] : [];
    return rows.filter(row => row.value != null).map(row => { const raw = { country, indicator, year: row.date, value: row.value }; const item = normalizeExternalFactor({ type: 'macro', title: `${indicator} ${country} ${row.date}`, summary: String(row.value), source: 'World Bank Open Data', published_at: `${row.date}-12-31T00:00:00.000Z`, status: 'verified', impact: 'context' }); return { ...item, source_url: url, provider_license: 'CC BY-4.0', raw_payload: raw, source_hash: hash(raw) }; });
  } };
}

function createGdeltNewsAdapter({ http = axios } = {}) {
  return { provider: 'gdelt-2.1', license: 'GDELT terms; verify display rights before public release', async fetch({ query, maxrecords = 50 } = {}) {
    if (!query) throw new Error('query is required');
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&format=json&maxrecords=${maxrecords}`;
    const response = await http.get(url, { timeout: 15000 }); const articles = response.data?.articles || [];
    return articles.map(article => { const raw = { url: article.url, title: article.title, seendate: article.seendate, domain: article.domain }; const item = normalizeExternalFactor({ type: 'news', title: article.title || null, summary: article.socialimage || null, source: article.domain || 'GDELT', published_at: parseGdeltDate(article.seendate), status: 'unverified', impact: 'unknown' }); return { ...item, source_url: article.url || url, provider_license: 'GDELT terms; verify display rights before public release', raw_payload: raw, source_hash: hash(raw) }; });
  } };
}

module.exports = { createWorldBankMacroAdapter, createGdeltNewsAdapter };
