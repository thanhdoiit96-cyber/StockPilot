'use strict';

const fs = require('fs');
const path = require('path');
const models = require('../src/models');

const SECTORS = {
  banking_finance: ['VCB','BID','CTG','TCB','MBB','ACB','VPB','STB','SHB','TPB','EIB','HDB','VIB','OCB','LPB','MSB','SSB','NAB','VAB','BVB','ABB','PGB'],
  securities: ['SSI','VND','HCM','VCI','VIX','SHS','VDS','FTS','CTS','BSI','ORS','AAS','VUA'],
  real_estate: ['VHM','VIC','VRE','NVL','PDR','KDH','NLG','DIG','DXG','CEO','KBC','BCM','SZC','SIP','LHG','TCH'],
  energy_resources: ['GAS','PLX','POW','PVS','PVD','BSR','DCM','DPM','QNS','SBT','VTV'],
  manufacturing: ['HPG','GVR','REE','BMP','HSG','NKG','TLH','VGC','GEX','PC1','DGC','DBC','PAN','KSB','VTQ','VTS','VTZ','VXB','X20','X26','X77'],
  consumer_retail: ['VNM','MSN','SAB','MWG','FRT','PNJ','DGW','PET','VTP','VVS','DBC','VTR'],
  healthcare: ['DHG','DBD','IMP','VXP'],
  technology: ['FPT','CMG','ELC','VGI','ICT'],
  construction_infrastructure: ['VCG','HUT','C4G','HHV','CII','CTD','HBC','IDI','ANV','VHC','ASM','FMC','VVN','VTX','XDC','XDH']
};
const sectorFor = code => Object.entries(SECTORS).find(([, codes]) => codes.includes(code))?.[0] || 'other';

function conciseReport(report, output) {
  return {
    generated_at: report.generated_at,
    minimum_observations: report.minimum_observations,
    universe_size: report.universe_size,
    eligible_symbols: report.eligible_symbols,
    incomplete_symbols: report.incomplete_symbols,
    sectors: Object.fromEntries(Object.entries(report.sectors).map(([name, sector]) => [name, {
      universe: sector.universe,
      eligible: sector.eligible,
      incomplete: sector.incomplete
    }])),
    detail_output: output,
    detail_hint: 'Set SECTOR_READINESS_VERBOSE=true to print the full symbol-level report.'
  };
}

async function main() {
  const minimum = Math.max(1, Number(process.env.VNSTOCK_MIN_OBSERVATIONS || 50));
  const stocks = await models.Stock.findAll({ attributes: ['id', 'code', 'name', 'industry'], order: [['code', 'ASC']] });
  const prices = await models.StockPrice.findAll({ attributes: ['stock_id', 'observed_at'] });
  const counts = new Map();
  for (const row of prices) counts.set(String(row.stock_id), (counts.get(String(row.stock_id)) || 0) + 1);
  const coverage = stocks.map(stock => ({ code: stock.code, name: stock.name, industry: stock.industry || null, sector: sectorFor(stock.code), observations: counts.get(String(stock.id)) || 0, eligible: (counts.get(String(stock.id)) || 0) >= minimum }));
  const sectors = {};
  for (const item of coverage) {
    const bucket = sectors[item.sector] ||= { universe: 0, eligible: 0, incomplete: 0, symbols: [], incomplete_symbols: [] };
    bucket.universe += 1;
    if (item.eligible) { bucket.eligible += 1; bucket.symbols.push(item.code); }
    else { bucket.incomplete += 1; bucket.incomplete_symbols.push({ code: item.code, observations: item.observations }); }
  }
  const report = { generated_at: new Date().toISOString(), minimum_observations: minimum, universe_size: coverage.length, eligible_symbols: coverage.filter(item => item.eligible).length, incomplete_symbols: coverage.filter(item => !item.eligible).length, sectors, incomplete: coverage.filter(item => !item.eligible) };
  const output = process.env.SECTOR_READINESS_OUTPUT || path.resolve(__dirname, '../evidence/sector-readiness-latest.json');
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  // The evidence remains complete for audit; terminal output stays actionable
  // unless an operator explicitly requests the large symbol-level listing.
  console.log(JSON.stringify(process.env.SECTOR_READINESS_VERBOSE === 'true' ? report : conciseReport(report, output), null, 2));
}

if (require.main === module) {
  main().catch(error => { console.error(error.stack || error); process.exitCode = 1; }).finally(async () => { await models.sequelize.close(); });
}

module.exports = { conciseReport };
