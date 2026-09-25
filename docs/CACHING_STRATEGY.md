> Phạm vi: tài liệu thiết kế mục tiêu và ví dụ tham khảo, chưa phải mô tả đầy đủ của bản đang chạy. Hiện trạng: [PROJECT_STATUS](PROJECT_STATUS.md); hành vi đã triển khai: [backend](../backend/README.md), [frontend](../frontend/README.md); cách chạy hiện hành: [QUICK_START](../QUICK_START.md).

# Caching Strategy - PostgreSQL based

Dự án **bỏ Redis** và dùng **PostgreSQL Cache Table** cho toàn bộ caching needs.

---

## 1. Tại Sao Thay Redis Bằng PostgreSQL?

| Tiêu Chí | Redis | PostgreSQL Cache | Reason |
|----------|-------|------------------|--------|
| **Cài Đặt** | Cần tool riêng | Dùng DB hiện tại | Đơn giản cho learning |
| **Data** | In-memory (mất khi restart) | Persistent | Dữ liệu không mất |
| **Chi Phí** | Tool thêm | Không | Học tập miễn phí |
| **Complexity** | Medium | Low | Ít tool hơn |

---

## 2. Cache Table Schema

```sql
CREATE TABLE system_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Cache Key & Value
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    cache_value JSONB NOT NULL,
    
    -- Metadata
    cache_type VARCHAR(50), -- 'stock_price', 'analysis', 'user_session'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- TTL (expires automatically)
    expires_at TIMESTAMP NOT NULL,
    
    -- Index for fast lookup
    INDEX idx_cache_key ON cache_key,
    INDEX idx_expires_at ON expires_at
);

-- Auto-cleanup trigger (run nightly)
-- DELETE FROM system_cache WHERE expires_at < NOW();
```

---

## 3. Caching Patterns

### Pattern 1: Stock Price Cache
```javascript
// SET
async function cacheStockPrice(stockId, priceData) {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min
  
  await database.query(`
    INSERT INTO system_cache (cache_key, cache_value, cache_type, expires_at)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (cache_key) DO UPDATE SET
      cache_value = $2, updated_at = NOW(), expires_at = $4
  `, [
    `stock_price:${stockId}`,
    JSON.stringify(priceData),
    'stock_price',
    expiresAt
  ]);
}

// GET
async function getStockPriceFromCache(stockId) {
  const result = await database.query(`
    SELECT cache_value FROM system_cache
    WHERE cache_key = $1 AND expires_at > NOW()
  `, [`stock_price:${stockId}`]);
  
  return result.rows[0]?.cache_value;
}

// DELETE
async function invalidateStockPriceCache(stockId) {
  await database.query(
    `DELETE FROM system_cache WHERE cache_key = $1`,
    [`stock_price:${stockId}`]
  );
}
```

### Pattern 2: Analysis Cache
```javascript
// Cache analysis hasil (2 hours TTL)
async function cacheAnalysis(stockId, analysisData) {
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
  
  await database.query(`
    INSERT INTO system_cache (cache_key, cache_value, cache_type, expires_at)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (cache_key) DO UPDATE SET
      cache_value = $2, expires_at = $4
  `, [
    `analysis:${stockId}`,
    JSON.stringify(analysisData),
    'analysis',
    expiresAt
  ]);
}
```

### Pattern 3: User Session Cache
```javascript
// Cache user session (24 hours TTL)
async function cacheUserSession(userId, sessionData) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  await database.query(`
    INSERT INTO system_cache (cache_key, cache_value, cache_type, expires_at)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (cache_key) DO UPDATE SET
      cache_value = $2, expires_at = $4
  `, [
    `session:${userId}`,
    JSON.stringify(sessionData),
    'user_session',
    expiresAt
  ]);
}
```

---

## 4. Cache Helper Service

```javascript
// backend/src/services/cacheService.js

class CacheService {
  constructor(database) {
    this.db = database;
  }

  /**
   * Set cache value with TTL (in minutes)
   */
  async set(key, value, ttlMinutes = 5, cacheType = 'general') {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    
    try {
      await this.db.query(`
        INSERT INTO system_cache (cache_key, cache_value, cache_type, expires_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (cache_key) DO UPDATE SET
          cache_value = $2, updated_at = NOW(), expires_at = $4
      `, [key, JSON.stringify(value), cacheType, expiresAt]);
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      // Continue without cache - don't break the app
    }
  }

  /**
   * Get cache value (returns null if expired or not found)
   */
  async get(key) {
    try {
      const result = await this.db.query(`
        SELECT cache_value FROM system_cache
        WHERE cache_key = $1 AND expires_at > NOW()
      `, [key]);
      
      if (result.rows.length === 0) return null;
      
      return JSON.parse(result.rows[0].cache_value);
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete cache entry
   */
  async delete(key) {
    try {
      await this.db.query(
        `DELETE FROM system_cache WHERE cache_key = $1`,
        [key]
      );
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete all cache of a type
   */
  async deleteByType(cacheType) {
    try {
      await this.db.query(
        `DELETE FROM system_cache WHERE cache_type = $1`,
        [cacheType]
      );
    } catch (error) {
      console.error(`Cache delete by type error:`, error);
    }
  }

  /**
   * Clear all expired cache (run periodically)
   */
  async cleanupExpired() {
    try {
      const result = await this.db.query(
        `DELETE FROM system_cache WHERE expires_at < NOW()`
      );
      console.log(`Cleaned up ${result.rowCount} expired cache entries`);
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }
}

module.exports = CacheService;
```

---

## 5. Sử Dụng Trong Backend

```javascript
// backend/src/controllers/stockController.js
const cacheService = require('../services/cacheService');

async function getStock(req, res) {
  const { stockId } = req.params;
  const cacheKey = `stock:${stockId}`;
  
  try {
    // 1. Try cache first
    let stock = await cacheService.get(cacheKey);
    
    if (stock) {
      console.log(`Cache HIT for ${cacheKey}`);
      return res.json(stock);
    }
    
    console.log(`Cache MISS for ${cacheKey}`);
    
    // 2. Query database if not cached
    stock = await Stock.findByPk(stockId);
    
    if (!stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }
    
    // 3. Store in cache (5 minutes TTL)
    await cacheService.set(cacheKey, stock.toJSON(), 5, 'stock_data');
    
    // 4. Return to client
    res.json(stock);
  } catch (error) {
    console.error('Error getting stock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getStock };
```

---

## 6. Cache TTLs (Recommended)

| Data Type | TTL | Reason |
|-----------|-----|--------|
| Stock Prices | 5 min | Update during trading hours |
| Technical Indicators | 5 min | Calculated with price |
| Fundamentals | 1 hour | Rarely changes |
| News | 30 min | Updates hourly |
| Analysis Results | 2 hours | Expensive to calculate |
| User Session | 24 hours | Persistent login |
| Market Index | 5 min | Real-time critical |
| Portfolio Data | 10 min | Can change with transactions |

---

## 7. Cleanup Job (Scheduled)

```javascript
// backend/src/jobs/cacheCleanup.js
const cron = require('node-cron');

// Run every hour at :00
cron.schedule('0 * * * *', async () => {
  try {
    console.log('Running cache cleanup...');
    await cacheService.cleanupExpired();
  } catch (error) {
    console.error('Cache cleanup job failed:', error);
  }
});
```

---

## 8. Monitoring Cache Performance

```javascript
// Track cache hits/misses
async function trackCacheMetric(cacheKey, hit) {
  const metric = hit ? 'cache_hit' : 'cache_miss';
  console.log(`[${metric}] ${cacheKey}`);
  
  // Optional: Store metrics for analysis
  // await metricsService.increment(metric);
}

// Usage
if (cachedValue) {
  trackCacheMetric(cacheKey, true);
} else {
  trackCacheMetric(cacheKey, false);
}
```

---

## 9. Performance Comparison

### With Redis (Old)
```
Request → Redis (< 1ms) → Return
Cost: Redis server running 24/7
```

### With PostgreSQL Cache (New)
```
Request → PostgreSQL (5-10ms) → Return
Cost: Same database connection
Benefit: Simpler, no extra tool
```

**Trade-off**: Slightly slower but acceptable for learning + simpler setup

---

## 10. Migration Steps

1. ✅ **Add cache table to DB schema** (in DATABASE_SCHEMA.md)
2. ✅ **Create cacheService.js** (backend/src/services/)
3. ✅ **Update controllers** to use cacheService
4. ✅ **Add cleanup job** (runs hourly)
5. ✅ **Update docker-compose.yml** (removed Redis)
6. ✅ **Update .env.example** (use CACHE_BACKEND=postgresql)

---

## 11. Troubleshooting

### Problem: Cache table growing too large
**Solution**: Run cleanup more frequently or lower TTLs

```javascript
// Run cleanup every 30 minutes instead of hourly
cron.schedule('*/30 * * * *', async () => {
  await cacheService.cleanupExpired();
});
```

### Problem: Cache not expiring
**Solution**: Make sure cleanup job is running

```javascript
// Check cache size
SELECT COUNT(*) FROM system_cache;
SELECT COUNT(*) FROM system_cache WHERE expires_at < NOW();
```

### Problem: Performance still slow
**Solution**: Add index on frequently queried columns

```sql
CREATE INDEX idx_cache_key_type ON system_cache(cache_key, cache_type);
CREATE INDEX idx_cache_expires ON system_cache(expires_at) 
WHERE expires_at < NOW();
```

---

## 12. Future Optimization

Nếu cần performance cao hơn sau này:
- ✅ Thêm **in-memory cache layer** (Node.js Map) cho very frequent keys
- ✅ Thêm **Redis** khi deploy production nếu cần
- ✅ Dùng **PostgreSQL JSON Caching Extensions** (pg_cache_ext)

Nhưng **cho bây giờ PostgreSQL Cache là đủ tốt!** 🎉

---

*Last Updated: 2026-09-16*

