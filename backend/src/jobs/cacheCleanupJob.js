/**
 * Cache Cleanup Job
 * Runs periodically to delete expired cache entries
 * 
 * Schedule: Every hour at :00 minute
 * 
 * Usage: Import and initialize in app.js
 * const initCacheCleanupJob = require('./jobs/cacheCleanupJob');
 * initCacheCleanupJob(cacheService);
 */

const cron = require('node-cron');

function initCacheCleanupJob(cacheService) {
  // Run every hour at :00 minute
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('[Cache Cleanup Job] Starting...');
      const deletedCount = await cacheService.cleanupExpired();
      console.log(`[Cache Cleanup Job] Completed - Deleted ${deletedCount} expired entries`);
    } catch (error) {
      console.error('[Cache Cleanup Job] Failed:', error.message);
    }
  });

  // Optional: Also run cleanup every 30 minutes for more aggressive cleanup
  // Uncomment if needed:
  // cron.schedule('*/30 * * * *', async () => {
  //   try {
  //     const deletedCount = await cacheService.cleanupExpired();
  //     console.log(`[Cache Cleanup Job] Deleted ${deletedCount} expired entries`);
  //   } catch (error) {
  //     console.error('[Cache Cleanup Job] Error:', error.message);
  //   }
  // });

  console.log('[Cache Cleanup Job] Initialized - Will run every hour');
}

module.exports = initCacheCleanupJob;
