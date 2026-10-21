const { classifyBreadth, forecastBreadthTarget } = require('./forecastBreadth');

test('classifies the forward breadth target at the documented boundaries', () => {
  expect(classifyBreadth(0)).toBe('declining');
  expect(classifyBreadth(0.4499)).toBe('declining');
  expect(classifyBreadth(0.45)).toBe('balanced');
  expect(classifyBreadth(0.55)).toBe('balanced');
  expect(classifyBreadth(0.5501)).toBe('advancing');
});

test('publishes a non-point target definition for forecast consumers', () => {
  expect(forecastBreadthTarget()).toEqual({
    version: 'breadth_forward_v1',
    unit: 'share_of_members_with_positive_return',
    point_estimate_available: false,
    bands: expect.arrayContaining([expect.objectContaining({ class: 'balanced', minimum: 0.45, maximum: 0.55 })])
  });
});
