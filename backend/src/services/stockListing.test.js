const { normalizeListingRow, syncStockListings } = require('./stockListing');

test('normalizes listed and delisted provider metadata without inferring unknown exchanges', () => {
  expect(normalizeListingRow({ symbol: 'bcg', name: 'Bamboo Capital', exchange: 'DELISTED' })).toMatchObject({ code: 'BCG', listing_status: 'delisted', exchange: 'DELISTED' });
  expect(normalizeListingRow({ symbol: 'FPT', exchange: 'HSX' })).toMatchObject({ code: 'FPT', listing_status: 'listed', exchange: 'HSX' });
  expect(normalizeListingRow({ symbol: 'FPT' })).toMatchObject({ code: 'FPT', listing_status: 'unknown', exchange: null });
  expect(normalizeListingRow({ symbol: 'bad;--' })).toBeNull();
});

test('updates only requested existing symbols and leaves unrelated stock records untouched', async () => {
  const update = jest.fn();
  const Stock = { findOrCreate: jest.fn().mockResolvedValue([{ name: 'Old name', industry: 'Existing industry', exchange: null, listing_status: null, update }, false]) };
  const result = await syncStockListings({ Stock, symbols: ['BCG'], rows: [
    { symbol: 'BCG', name: 'Bamboo Capital', exchange: 'DELISTED' },
    { symbol: 'FPT', name: 'FPT Corporation', exchange: 'HSX' }
  ] });
  expect(result).toMatchObject({ received: 2, updated: 1, created: 0, skipped: 1 });
  expect(Stock.findOrCreate).toHaveBeenCalledTimes(1);
  expect(Stock.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({ where: { code: 'BCG' } }));
  expect(update).toHaveBeenCalledWith({ name: 'Bamboo Capital', exchange: 'DELISTED', listing_status: 'delisted', listing_checked_at: expect.any(Date) });
});

test('re-running a listing sync timestamps unchanged metadata without counting it as an update', async () => {
  const update = jest.fn();
  const Stock = { findOrCreate: jest.fn().mockResolvedValue([{ name: 'FPT', industry: null, exchange: 'HSX', listing_status: 'listed', update }, false]) };
  const checkedAt = new Date('2026-09-22T08:00:00Z');
  await expect(syncStockListings({ Stock, rows: [{ symbol: 'FPT', name: 'FPT', exchange: 'HSX' }], checkedAt })).resolves.toMatchObject({ unchanged: 1, updated: 0, checked: 1 });
  expect(update).toHaveBeenCalledWith({ listing_checked_at: checkedAt });
});
