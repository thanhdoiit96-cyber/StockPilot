const { sectorFromIndustry } = require('./sectorClassifier');

test('classifies explicit provider industry labels without using company names', () => {
  expect(sectorFromIndustry('Ngân hàng thương mại')).toBe('banking_finance');
  expect(sectorFromIndustry('Technology Software')).toBe('technology');
  expect(sectorFromIndustry('Bất động sản')).toBe('real_estate');
  expect(sectorFromIndustry('')).toBeNull();
  expect(sectorFromIndustry('Công ty cổ phần ABC')).toBeNull();
});
