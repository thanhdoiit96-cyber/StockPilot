'use strict';
const models = require('../src/models');
const { fetchCompanyProfile, normalizeCompanyProfile } = require('../src/services/companyProfileService');
const { fetchCompanyPeople, normalizeCompanyPeople } = require('../src/services/companyPeopleService');
const { fetchCompanyCapital, normalizeCompanyCapital } = require('../src/services/companyCapitalService');
const { fetchCompanyFinancials, normalizeCompanyFinancials } = require('../src/services/companyFinancialService');
const { fetchCompanyNews, normalizeCompanyNews } = require('../src/services/companyNewsService');
const { saveCompanySnapshot } = require('../src/services/companySnapshotStore');
const { companyIngestionLimits, wait } = require('../src/services/companyIngestionControl');

const adapters = {
  profile: async stock => normalizeCompanyProfile({ stock, providerPayload: await fetchCompanyProfile(stock.code) }),
  people: async stock => normalizeCompanyPeople({ symbol: stock.code, providerPayload: await fetchCompanyPeople(stock.code) }),
  capital: async stock => normalizeCompanyCapital({ symbol: stock.code, providerPayload: await fetchCompanyCapital(stock.code) }),
  financials: async stock => normalizeCompanyFinancials({ symbol: stock.code, providerPayload: await fetchCompanyFinancials(stock.code) }),
  news: async stock => normalizeCompanyNews({ symbol: stock.code, providerPayload: await fetchCompanyNews(stock.code) })
};

async function run() {
  const started = Date.now();
  const symbols = String(process.env.COMPANY_DATA_SYMBOLS || process.argv[2] || 'FPT').split(',').map(value => value.trim().toUpperCase()).filter(Boolean).slice(0, 20);
  const scopes = String(process.env.COMPANY_DATA_SCOPES || process.argv[3] || 'profile,people,capital,financials,news').split(',').map(value => value.trim()).filter(value => adapters[value]);
  const limits = companyIngestionLimits();
  const rows = await models.Stock.findAll({ where: { code: symbols } });
  const bySymbol = new Map(rows.map(row => [row.code.toUpperCase(), row.toJSON()]));
  const tasks = symbols.flatMap(symbol => scopes.map(dataset => ({ symbol, dataset, stock: bySymbol.get(symbol) }))).filter(task => task.stock);
  const report = { requested_symbols: symbols, scopes, limits, valid: 0, stored: 0, skipped: 0, failed: 0, circuit_open: false, results: [] };
  let consecutiveFailures = 0;
  for (let index = 0; index < tasks.length; index++) {
    const { symbol, dataset, stock } = tasks[index];
    if (consecutiveFailures >= limits.max_consecutive_failures) {
      report.circuit_open = true; report.skipped++;
      report.results.push({ symbol, dataset, status: 'skipped', reason: 'provider_circuit_open' });
      continue;
    }
    const itemStarted = Date.now();
    try {
      const data = await adapters[dataset](stock);
      consecutiveFailures = 0;
      if (['available', 'partial'].includes(data.status)) report.valid++;
      const result = await saveCompanySnapshot({ CompanyDataSnapshot: models.CompanyDataSnapshot, stockId: stock.id, dataset, data });
      report[result.stored ? 'stored' : 'skipped']++;
      report.results.push({ symbol, dataset, status: data.status, provider: data.provenance?.provider || null, duration_ms: Date.now() - itemStarted, ...result });
      if (index < tasks.length - 1) await wait(limits.request_delay_ms);
    } catch (error) {
      consecutiveFailures++; report.failed++;
      report.results.push({ symbol, dataset, status: 'failed', duration_ms: Date.now() - itemStarted, error: error.message });
      if (index < tasks.length - 1) await wait(limits.failure_cooldown_ms);
    }
  }
  report.duration_ms = Date.now() - started;
  console.log(JSON.stringify(report, null, 2));
  if (!report.valid) process.exitCode = 2;
}

run().catch(error => { console.error(JSON.stringify({ error: error.message })); process.exitCode = 1; }).finally(() => models.sequelize.close());
