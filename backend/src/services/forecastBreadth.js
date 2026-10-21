'use strict';

const BREADTH_BANDS = Object.freeze([
  Object.freeze({ class: 'declining', minimum: 0, maximum: 0.45, minimum_inclusive: true, maximum_inclusive: false }),
  Object.freeze({ class: 'balanced', minimum: 0.45, maximum: 0.55, minimum_inclusive: true, maximum_inclusive: true }),
  Object.freeze({ class: 'advancing', minimum: 0.55, maximum: 1, minimum_inclusive: false, maximum_inclusive: true })
]);

function classifyBreadth(value) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error('Invalid breadth');
  return value < 0.45 ? 'declining' : value > 0.55 ? 'advancing' : 'balanced';
}

function forecastBreadthTarget() {
  return {
    version: 'breadth_forward_v1',
    unit: 'share_of_members_with_positive_return',
    point_estimate_available: false,
    bands: BREADTH_BANDS.map(band => ({ ...band }))
  };
}

module.exports = { BREADTH_BANDS, classifyBreadth, forecastBreadthTarget };
