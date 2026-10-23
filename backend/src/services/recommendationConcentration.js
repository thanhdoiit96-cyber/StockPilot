'use strict';
function recommendationConcentration(run, verified = false) {
  const items = run?.recommendations || [];
  const groups = new Map();
  if (verified) for (const item of items) {
    const industry = item.rationale?.snapshot_taxonomy?.industry;
    if (typeof industry === 'string' && industry.trim()) groups.set(industry.trim(), (groups.get(industry.trim()) || 0) + 1);
  }
  const sectors = [...groups].map(([industry, selected]) => ({ industry, selected })).sort((a, b) => b.selected - a.selected || a.industry.localeCompare(b.industry));
  const known = sectors.reduce((sum, sector) => sum + sector.selected, 0);
  const complete = verified && items.length > 0 && known === items.length;
  const share = complete ? Number((sectors[0].selected / items.length * 100).toFixed(2)) : null;
  return { basis: 'selected_symbol_count', taxonomy_source: 'snapshot', status: !verified ? 'snapshot_unverified' : complete ? 'complete' : 'taxonomy_incomplete',
    selected_count: items.length, classified_count: known, missing_taxonomy_count: items.length - known, sectors,
    max_sector: complete ? sectors[0].industry : null, max_sector_share_pct: share,
    concentration_warning: share != null && share >= 60 ? 'sector_concentration_at_or_above_60_pct' : null };
}
module.exports = { recommendationConcentration };
