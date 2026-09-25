const { SECTOR_CODES, SECTOR_LABELS, CLASSIFIED_CODES, sectorForCode } = require('./sectorCatalog');

test('keeps the sector catalog unique and fully labelled', () => {
  const entries = Object.entries(SECTOR_CODES);
  const codes = entries.flatMap(([, symbols]) => symbols);
  expect(new Set(codes).size).toBe(codes.length);
  expect(Object.keys(SECTOR_LABELS).sort()).toEqual(entries.map(([sector]) => sector).sort());
  expect(CLASSIFIED_CODES).toHaveLength(codes.length);
  expect(sectorForCode('DBC')).toBe('consumer_retail');
  expect(sectorForCode('unknown')).toBeNull();
});
