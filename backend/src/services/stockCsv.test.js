const { csvCell, serializeStockCsv } = require('./stockCsv');

test('escapes spreadsheet formulas and quotes in stock CSV', () => {
  expect(csvCell('=HYPERLINK("https://example.test")')).toBe('"\'=HYPERLINK(""https://example.test"")"');
});

test('serializes selected data columns with UTF-8 BOM and EOD labels', () => {
  const csv = serializeStockCsv([{ code: 'FPT', name: 'FPT Corp', price: 100000, volume: 1200, data_source: 'vnstock' }], { name: false, volume: true });
  expect(csv.startsWith('\uFEFF')).toBe(true);
  expect(csv).toContain('"Mã","Giá EOD","Khối lượng","Nguồn dữ liệu"');
  expect(csv).toContain('"FPT","100000","1200","vnstock"');
  expect(csv).not.toContain('FPT Corp');
});
