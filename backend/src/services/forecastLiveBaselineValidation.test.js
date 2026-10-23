const { validLiveBaseline } = require('./forecastLiveBaselineValidation');
const { buildContemporaneousLiveBaseline } = require('./forecastLiveBaseline');
const scope = { contract_version: 'vn_observation_dates_v3', used_symbols: ['FPT'], as_of_date: '2026-09-30' };
const context = { horizon: 5, asOf: scope.as_of_date, issuedAt: '2026-09-30T10:00:00Z', scope };
function baseline() {
  const rows = Array.from({ length: 30 }, (_, index) => {
    const day = `2026-09-${String(index + 1).padStart(2, '0')}`;
    return { instrument: { symbol: 'FPT' }, observed_at: `${day}T00:00:00Z`, fetched_at: `${day}T09:00:00Z`, quote: { close: 100 + index } };
  });
  return buildContemporaneousLiveBaseline({ rows, fetched_at: context.issuedAt }, 5, { inputScope: scope });
}
test('accepts baseline built from the matching sealed scope', () => expect(validLiveBaseline(baseline(), context)).toBe(true));
test.each([
  b => { delete b.completed_outcomes; },
  b => { b.training_to = '2026-09-31'; },
  b => { b.fit_cutoff = '2026-10-01T00:00:00Z'; },
  b => { b.frequency_probabilities.pop(); },
  b => { b.persistence_probabilities[0].value = NaN; },
  b => { b.frequency_probabilities[0].class = b.frequency_probabilities[1].class; },
  b => { b.input_policy.symbols = ['HPG']; }
])('rejects malformed or incompatible baseline %#', mutate => {
  const value = baseline(); mutate(value);
  expect(validLiveBaseline(value, context)).toBe(false);
});
