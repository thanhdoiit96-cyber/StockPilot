const { summarizeRecommendationExclusions } = require('./recommendationExclusions');
test('counts each excluded signal once per reason and keeps overlapping reasons explicit', () => {
  expect(summarizeRecommendationExclusions([
    { measurement_status: 'excluded', exclusion_reasons: ['snapshot_unverified', 'snapshot_unverified', 'return_mismatch'] },
    { measurement_status: 'excluded', exclusion_reasons: ['snapshot_unverified'] },
    { measurement_status: 'pending', exclusion_reasons: ['return_mismatch'] },
    { measurement_status: 'eligible', exclusion_reasons: ['return_mismatch'] },
    { measurement_status: 'excluded', exclusion_reasons: [] }
  ])).toEqual([{ reason: 'snapshot_unverified', count: 2 }, { reason: 'return_mismatch', count: 1 }, { reason: 'unspecified_evidence_failure', count: 1 }]);
});
