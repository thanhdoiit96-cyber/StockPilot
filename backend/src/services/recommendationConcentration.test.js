const { recommendationConcentration } = require('./recommendationConcentration');
const item = industry => ({ rationale: { snapshot_taxonomy: { industry } }, stock: { industry: 'current_classification' } });
test('uses frozen selected-symbol counts and the existing 60 percent threshold', () => {
  expect(recommendationConcentration({ recommendations: [item('bank'), item('bank'), item('bank'), item('tech'), item('tech')] }, true)).toMatchObject({ basis: 'selected_symbol_count', status: 'complete', max_sector: 'bank', max_sector_share_pct: 60, classified_count: 5, concentration_warning: 'sector_concentration_at_or_above_60_pct' });
});
test('does not infer concentration from partial or unverified taxonomy or current stock data', () => {
  const run = { recommendations: [item('bank'), item('')] };
  expect(recommendationConcentration(run, true)).toMatchObject({ status: 'taxonomy_incomplete', classified_count: 1, missing_taxonomy_count: 1, max_sector_share_pct: null, concentration_warning: null });
  expect(recommendationConcentration(run)).toMatchObject({ status: 'snapshot_unverified', classified_count: 0, max_sector_share_pct: null });
  expect(recommendationConcentration({ recommendations: [] }, true).max_sector_share_pct).toBeNull();
});
