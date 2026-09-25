const { QueryTypes } = require('sequelize');
const CacheService = require('./cacheService');

describe('PostgreSQL cache result handling', () => {
  let db;
  let cache;
  beforeEach(() => {
    db = { QueryTypes, query: jest.fn() };
    cache = new CacheService(db);
  });
  test.each([{ price: 123 }, [1, 2], 'text', false, 0])('returns decoded JSONB %j', async value => {
    db.query.mockResolvedValue([{ cache_value: value }]);
    expect(await cache.get('sample')).toEqual(value);
  });
  test('returns null for absent or expired entries', async () => {
    db.query.mockResolvedValue([]);
    expect(await cache.get('missing')).toBeNull();
  });
  test('binds individual invalidation keys', async () => {
    db.query.mockResolvedValue([[], { rowCount: 1 }]);
    await cache.delete("stock:'123");
    expect(db.query).toHaveBeenCalledWith(expect.any(String), { bind: ["stock:'123"] });
  });
  test('retains all cache categories', async () => {
    db.query.mockResolvedValueOnce([{ count: '5' }])
      .mockResolvedValueOnce([{ count: '1' }])
      .mockResolvedValueOnce([{ cache_type: 'stock', count: '3' }, { cache_type: 'stock_price', count: '1' }]);
    expect(await cache.getStats()).toEqual({ totalEntries: 5, expiredEntries: 1, byType: { stock: 3, stock_price: 1 } });
  });
  test('reads deletion counts from PostgreSQL metadata', async () => {
    db.query.mockResolvedValue([[], { rowCount: 3 }]);
    expect(await cache.cleanupExpired()).toBe(3);
  });
  test('does not report successful invalidation after database failure', async () => {
    db.query.mockRejectedValue(new Error('unavailable'));
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(cache.clearAll()).rejects.toThrow('unavailable');
    log.mockRestore();
  });
});
