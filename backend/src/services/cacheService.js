
/**
 * Backend Cache Service
 * Uses PostgreSQL system_cache table instead of Redis
 * 
 * Usage:
 * const cacheService = new CacheService(database);
 * await cacheService.set('key', value, 5, 'stock_price');
 * const cached = await cacheService.get('key');
 */

class CacheService {
  constructor(database) {
    this.db = database;
  }

  /**
   * Set cache value with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache (will be JSON stringified)
   * @param {number} ttlMinutes - Time to live in minutes (default: 5)
   * @param {string} cacheType - Type of cache for organization (default: 'general')
   */
  async set(key, value, ttlMinutes = 5, cacheType = 'general') {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    try {
      await this.db.query(
        `INSERT INTO system_cache (id, cache_key, cache_value, cache_type, expires_at, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (cache_key) DO UPDATE SET
           cache_value = $2, cache_type = $3, updated_at = NOW(), expires_at = $4`,
        {
          bind: [key, JSON.stringify(value), cacheType, expiresAt],
          type: this.db.QueryTypes.INSERT
        }
      );
    } catch (error) {
      console.error(`Cache SET error for key ${key}:`, error.message);
    }
  }

  /**
   * Get cache value (returns null if expired or not found)
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    try {
      const rows = await this.db.query(
        `SELECT cache_value FROM system_cache
         WHERE cache_key = $1 AND expires_at > NOW()`,
        {
          bind: [key],
          type: this.db.QueryTypes.SELECT
        }
      );

      if (!rows || rows.length === 0) return null;
      return rows[0].cache_value;
    } catch (error) {
      console.error(`Cache GET error for key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Delete specific cache entry
   * @param {string} key - Cache key
   */
  async delete(key) {
    try {
      await this.db.query(`DELETE FROM system_cache WHERE cache_key = $1`, { bind: [key] });
    } catch (error) {
      console.error(`Cache DELETE error for key ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete all cache entries of a specific type
   * @param {string} cacheType - Type of cache to delete
   */
  async deleteByType(cacheType) {
    try {
      const [, result] = await this.db.query(
        `DELETE FROM system_cache WHERE cache_type = $1`,
        {
          bind: [cacheType],
          type: this.db.QueryTypes.RAW
        }
      );
      const deletedCount = result?.rowCount ?? 0;
      console.log(`Cleared ${deletedCount} cache entries of type: ${cacheType}`);
    } catch (error) {
      console.error(`Cache DELETE BY TYPE error:`, error.message);
      throw error;
    }
  }

  /**
   * Clear all cache
   */
  async clearAll() {
    try {
      const [, result] = await this.db.query(`DELETE FROM system_cache`, {
        type: this.db.QueryTypes.RAW
      });
      const deletedCount = result?.rowCount ?? 0;
      console.log(`Cleared all ${deletedCount} cache entries`);
    } catch (error) {
      console.error(`Cache CLEAR ALL error:`, error.message);
      throw error;
    }
  }

  /**
   * Clean up expired cache (run periodically via job)
   * @returns {Promise<number>} Number of deleted entries
   */
  async cleanupExpired() {
    try {
      const [, result] = await this.db.query(
        `DELETE FROM system_cache WHERE expires_at < NOW()`,
        { type: this.db.QueryTypes.RAW }
      );
      const deletedCount = result?.rowCount ?? 0;
      console.log(`[Cache Cleanup] Deleted ${deletedCount} expired entries`);
      return deletedCount;
    } catch (error) {
      console.error('Cache cleanup error:', error.message);
      return 0;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<object>} Cache stats
   */
  async getStats() {
    try {
      const [totalRows] = await this.db.query(
        `SELECT COUNT(*) as count FROM system_cache`,
        { type: this.db.QueryTypes.SELECT }
      );
      const [expiredRows] = await this.db.query(
        `SELECT COUNT(*) as count FROM system_cache WHERE expires_at < NOW()`,
        { type: this.db.QueryTypes.SELECT }
      );
      const byTypeRows = await this.db.query(
        `SELECT cache_type, COUNT(*) as count FROM system_cache 
         WHERE expires_at > NOW() GROUP BY cache_type`,
        { type: this.db.QueryTypes.SELECT }
      );

      const byType = Array.isArray(byTypeRows) ? byTypeRows : [byTypeRows].filter(Boolean);

      return {
        totalEntries: parseInt((totalRows && totalRows.count) || 0, 10),
        expiredEntries: parseInt((expiredRows && expiredRows.count) || 0, 10),
        byType: byType.reduce((acc, row) => {
          acc[row.cache_type] = Number(row.count || 0);
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Cache stats error:', error.message);
      return { totalEntries: 0, expiredEntries: 0, byType: {} };
    }
  }
}

module.exports = CacheService;
