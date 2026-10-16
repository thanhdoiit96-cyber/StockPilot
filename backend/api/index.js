const appModule = require('../src/app');

const passthroughRoutes = new Set(['/api/health', '/api/debug-env']);

async function handler(req, res) {
  try {
    const isPassthrough = typeof req?.path === 'string' && passthroughRoutes.has(req.path);
    if (!isPassthrough) {
      await appModule.ensureAppInitialized();
    }
    return appModule(req, res);
  } catch (error) {
    console.error('[Vercel Handler] Failed to initialize app:', error);
    if (res.headersSent) return;
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message || 'Unknown server error'
    });
  }
}

module.exports = handler;
module.exports.app = appModule;
module.exports.ensureAppInitialized = appModule.ensureAppInitialized;
