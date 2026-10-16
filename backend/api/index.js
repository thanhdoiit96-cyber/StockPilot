const appModule = require('../src/app');

async function handler(req, res, next) {
  try {
    await appModule.ensureAppInitialized();
    return appModule(req, res, next);
  } catch (error) {
    return next(error);
  }
}

module.exports = handler;
module.exports.app = appModule;
module.exports.ensureAppInitialized = appModule.ensureAppInitialized;
