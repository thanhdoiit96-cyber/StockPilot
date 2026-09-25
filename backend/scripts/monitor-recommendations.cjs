'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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

async function main() {
  const run = await models.RecommendationRun.findOne({ order: [['created_at', 'DESC']], include: [{ association: 'recommendations', include: [{ association: 'stock', attributes: ['code', 'name'] }] }] });
  if (!run) throw new Error('no recommendation snapshot found');
  const items = run.recommendations || [];
  const measured = items.filter(item => item.outcome && item.outcome !== 'pending' && item.forward_return_pct != null);
  const pending = items.filter(item => !item.outcome || item.outcome === 'pending');
  const bySector = {};
  for (const item of items) {
    const code = item.stock?.code || 'UNKNOWN';
    const sector = sectorFor(code);
    const bucket = bySector[sector] ||= { selected: 0, measured: 0, pending: 0, positive: 0, average_forward_return_pct: null };
    bucket.selected += 1;
    if (item.outcome && item.outcome !== 'pending' && item.forward_return_pct != null) {
      bucket.measured += 1;
      if (item.outcome === 'positive') bucket.positive += 1;
    } else bucket.pending += 1;
  }
  for (const [sector, bucket] of Object.entries(bySector)) {
    const returns = items.filter(item => sectorFor(item.stock?.code || '') === sector && item.outcome && item.outcome !== 'pending' && item.forward_return_pct != null).map(item => Number(item.forward_return_pct));
    bucket.average_forward_return_pct = returns.length ? Number((returns.reduce((sum, value) => sum + value, 0) / returns.length).toFixed(4)) : null;
  }
  const largestSector = Object.entries(bySector).sort((a, b) => b[1].selected - a[1].selected)[0];
  const maxSectorSharePct = largestSector ? Number((largestSector[1].selected / Math.max(1, items.length) * 100).toFixed(2)) : 0;
  const snapshotPayload = items.map(item => ({ rank: item.rank, stock_id: item.stock_id, code: item.stock?.code, entry_price: item.entry_price == null ? null : Number(item.entry_price), horizon_days: item.horizon_days, rationale: item.rationale })).sort((a, b) => a.rank - b.rank);
  const snapshotHash = crypto.createHash('sha256').update(JSON.stringify({ run_id: run.id, as_of: run.as_of, model: run.model, provider: run.provider, snapshot: snapshotPayload })).digest('hex');
  const report = {
    generated_at: new Date().toISOString(),
    run: { id: run.id, as_of: run.as_of, created_at: run.created_at, model: run.model, provider: run.provider, horizon_days: run.horizon_days, universe_size: run.universe_size, selected_count: run.selected_count, snapshot_sha256: snapshotHash },
    status: { selected: items.length, measured: measured.length, pending: pending.length, hit_rate_pct: measured.length ? Number((measured.filter(item => item.outcome === 'positive').length / measured.length * 100).toFixed(2)) : null, evaluation_ready: pending.length === 0, max_sector_share_pct: maxSectorSharePct, concentration_warning: maxSectorSharePct >= 60 ? 'sector_concentration_at_or_above_60_pct' : null },
    by_sector: bySector,
    selected: items.map(item => ({ rank: item.rank, code: item.stock?.code, sector: sectorFor(item.stock?.code || ''), outcome: item.outcome || 'pending', forward_return_pct: item.forward_return_pct == null ? null : Number(item.forward_return_pct) }))
  };
  const output = process.env.RECOMMENDATION_MONITOR_OUTPUT || path.resolve(__dirname, '../evidence/recommendation-monitor-latest.json');
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; }).finally(async () => { await models.sequelize.close(); });
