const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const isVercelRuntime = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const isLocalServerProcess = require.main === module && !isVercelRuntime;
const { assertSecureAuthConfig, buildCorsOptions } = require('./config/authRuntime');
const { buildSequelizeConnection, resolveDatabaseConnectionConfig } = require('./config/config');
assertSecureAuthConfig();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const { Sequelize } = require('sequelize');

// Import services
const CacheService = require('./services/cacheService');
const CacheCleanupJob = require('./jobs/cacheCleanupJob');
const startVnstockEodJob = require('./jobs/vnstockEodJob');
const startRecommendationEvaluationJob = require('./jobs/recommendationEvaluationJob');
const startRecommendationLifecycleCheckpointJob = require('./jobs/recommendationLifecycleCheckpointJob');
const { startVnstockListingJob } = require('./jobs/vnstockListingJob');
const { startQuoteFreshnessJob } = require('./jobs/quoteFreshnessJob');
const { startForecastLiveCycleJob } = require('./jobs/forecastLiveCycleJob');
const { startForeignFlowJob } = require('./jobs/foreignFlowJob');
const { startCompanyDataSnapshotJob } = require('./jobs/companyDataSnapshotJob');
const { readCompanyExpansionGate } = require('./services/companyIngestionRun');
const marketDataController = require('./controllers/marketDataController');
const authController = require('./controllers/authController');
const watchlistController = require('./controllers/watchlistController');
const portfolioController = require('./controllers/portfolioController');
const recommendationController = require('./controllers/recommendationController');
const advisorController = require('./controllers/advisorController');
const forecastController = require('./controllers/forecastController')();
const requireAdmin = require('./middleware/requireAdmin');
const requestMetrics = require('./middleware/requestMetrics');
const { createRequestMetrics } = require('./services/requestMetrics');

// Initialize Express app
const app = express();
const metrics = createRequestMetrics();

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Middleware
app.use(helmet());
app.use(requestMetrics(metrics));
app.use(cors(buildCorsOptions()));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
  skip: req => req.method === 'GET' && [
    '/api/health',
    '/api/cache/stats',
    '/api/stocks/data-quality',
    '/api/stocks/quotes/status'
  ].includes(req.path)
});
app.use('/api/', limiter);

// Database configuration
const primaryDatabaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
const dbConfig = resolveDatabaseConnectionConfig({
  databaseUrl: primaryDatabaseUrl,
  host: process.env.DB_HOST,
  dbHost: process.env.DB_HOST,
  dbName: process.env.DB_NAME,
  dbUser: process.env.DB_USER,
  dbPassword: process.env.DB_PASSWORD
});

// Initialize Sequelize
logger.warn('[DB_BOOT] Database env state', {
  hasDatabaseUrl: Boolean(dbConfig.databaseUrl || primaryDatabaseUrl),
  hasDbPassword: Boolean(dbConfig.password),
  hasDbHost: Boolean(dbConfig.host),
  hasDbUser: Boolean(dbConfig.username),
  hasDbName: Boolean(dbConfig.database),
  driver: 'postgres'
});

const sequelizeConnection = buildSequelizeConnection({
  databaseUrl: dbConfig.databaseUrl || primaryDatabaseUrl,
  host: dbConfig.host,
  dbHost: dbConfig.host,
  dbName: dbConfig.database,
  dbUser: dbConfig.username,
  dbPassword: dbConfig.password
});

const sequelize = new Sequelize(...sequelizeConnection.args);

// Initialize Cache Service
let cacheService;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/debug-env', (req, res) => {
  res.json({
    success: true,
    data: {
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasDbPassword: Boolean(process.env.DB_PASSWORD),
      typeDbPassword: typeof process.env.DB_PASSWORD,
      dbPasswordLength: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD).length : 0,
      dbHost: process.env.DB_HOST || null,
      dbUser: process.env.DB_USER || null,
      dbName: process.env.DB_NAME || null,
      dbPort: process.env.DB_PORT || null,
      nodeEnv: process.env.NODE_ENV || null
    }
  });
});

app.get('/api/ops/metrics', requireAdmin, async (req, res) => {
  const workerUrl = process.env.VNSTOCK_WORKER_URL || 'http://127.0.0.1:8787';
  let worker = { available: false };
  try {
    const response = await fetch(`${workerUrl}/metrics`, { signal: AbortSignal.timeout(1500) });
    if (response.ok) worker = { available: true, ...(await response.json()) };
  } catch (_) {
    worker = { available: false };
  }
  return res.json({ success: true, data: { backend: metrics.snapshot(), worker } });
});

app.get('/api/ops/metrics/prometheus', requireAdmin, async (req, res) => {
  const workerUrl = process.env.VNSTOCK_WORKER_URL || 'http://127.0.0.1:8787';
  let worker = { available: false };
  try {
    const response = await fetch(`${workerUrl}/metrics`, { signal: AbortSignal.timeout(1500) });
    if (response.ok) worker = { available: true, ...(await response.json()) };
  } catch (_) {}
  const backend = metrics.snapshot();
  const lines = [
    '# HELP stockpilot_backend_requests_total Backend requests observed.',
    '# TYPE stockpilot_backend_requests_total counter',
    `stockpilot_backend_requests_total ${backend.requests}`,
    '# HELP stockpilot_backend_errors_total Backend responses with status >= 400.',
    '# TYPE stockpilot_backend_errors_total counter',
    `stockpilot_backend_errors_total ${backend.errors}`,
    '# HELP stockpilot_backend_auth_failures_total Backend 401/403 responses.',
    '# TYPE stockpilot_backend_auth_failures_total counter',
    `stockpilot_backend_auth_failures_total ${backend.auth_failures}`,
    '# HELP stockpilot_backend_cors_failures_total Backend requests rejected by the CORS policy.',
    '# TYPE stockpilot_backend_cors_failures_total counter',
    `stockpilot_backend_cors_failures_total ${backend.cors_failures}`,
    '# HELP stockpilot_backend_average_latency_ms Average backend response latency.',
    '# TYPE stockpilot_backend_average_latency_ms gauge',
    `stockpilot_backend_average_latency_ms ${backend.average_latency_ms}`,
    '# HELP stockpilot_worker_requests_total Worker requests observed.',
    '# TYPE stockpilot_worker_requests_total counter',
    `stockpilot_worker_requests_total ${worker.requests || 0}`,
    '# HELP stockpilot_worker_errors_total Worker errors observed.',
    '# TYPE stockpilot_worker_errors_total counter',
    `stockpilot_worker_errors_total ${worker.errors || 0}`,
    '# HELP stockpilot_worker_partial_total Worker partial responses observed.',
    '# TYPE stockpilot_worker_partial_total counter',
    `stockpilot_worker_partial_total ${worker.partial || 0}`
  ];
  return res.type('text/plain').send(`${lines.join('\n')}\n`);
});

// AI gate status is read-only operational evidence; it never enables generative AI by itself.
app.get('/api/ai-gate', (req, res) => {
  try {
    const evidenceDir = path.resolve(__dirname, '..', 'evidence');
    const files = fs.existsSync(evidenceDir)
      ? fs.readdirSync(evidenceDir).filter(file => /^ai-gate-\d{4}-\d{2}-\d{2}\.json$/.test(file)).sort().reverse()
      : [];
    if (!files.length) return res.json({ success: true, data: { status: 'unavailable', enabled: false, reasons: ['ai_gate_artifact_missing'] } });
    const artifact = JSON.parse(fs.readFileSync(path.join(evidenceDir, files[0]), 'utf8'));
    return res.json({ success: true, data: { ...artifact, artifact: files[0], status: artifact.enabled ? 'enabled' : 'disabled' } });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Không thể đọc trạng thái AI Gate: ${error.message}` });
  }
});

app.get('/api/ops/company-data/gate', async (req, res) => {
  try {
    const { CompanyDataIngestionRun } = require('./models');
    const gate = await readCompanyExpansionGate({
      CompanyDataIngestionRun,
      requiredScopes: ['people', 'capital', 'financials', 'news'],
      currentScopes: process.env.COMPANY_DATA_SCOPES || 'profile'
    });
    return res.json({ success: true, data: gate });
  } catch (error) {
    logger.error('[Ops] Company expansion gate read failed:', error);
    return res.status(500).json({ success: false, message: `Không thể đọc trạng thái gate company data: ${error.message}` });
  }
});

// Cache stats endpoint
app.get('/api/cache/stats', async (req, res) => {
  try {
    const stats = await cacheService.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting cache stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cache clear endpoint
app.post('/api/cache/clear', requireAdmin, async (req, res) => {
  try {
    await cacheService.clearAll();
    res.json({ success: true, message: 'Cache cleared' });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Initialize server
const PORT = process.env.PORT || 5000;
let initPromise = null;

async function initializeApp() {
  if (cacheService && app._stockRoutesMounted) return app;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await sequelize.authenticate();
      logger.info('[Database] Connected successfully');

      cacheService = new CacheService(sequelize);
      logger.info('[Cache] Service initialized');

      const stockController = require('./controllers/stockController')(cacheService);
      app.use('/api/stocks', stockController);
      app.use('/api/market-data', marketDataController);
      app.use('/api/auth', authController);
      app.use('/api/watchlist', watchlistController);
      app.use('/api/portfolio', portfolioController);
      app.use('/api/recommendations', recommendationController);
      app.use('/api/advisor/conversations', advisorController);
      app.use('/api/forecast', forecastController);
      app._stockRoutesMounted = true;
      logger.info('[Routes] /api/* mounted');

      if (isLocalServerProcess) {
        CacheCleanupJob(cacheService);
        logger.info('[Scheduler] Cache cleanup job initialized');
        if (startVnstockEodJob({ cacheService, logger })) {
          logger.info(`[Scheduler] Vnstock EOD job initialized (${process.env.VNSTOCK_EOD_CRON || '30 15 * * 1-5'})`);
        }
        if (startRecommendationEvaluationJob({ logger })) {
          logger.info(`[Scheduler] Recommendation evaluation job initialized (${process.env.RECOMMENDATION_EVALUATION_CRON || '0 15 * * 1-5'})`);
        }
        if (startRecommendationLifecycleCheckpointJob({ logger })) {
          logger.info(`[Scheduler] Recommendation lifecycle checkpoint initialized (${process.env.RECOMMENDATION_LIFECYCLE_CHECK_CRON || '0 15 * * 1-5'})`);
        }
        if (startVnstockListingJob({ cacheService, logger })) {
          logger.info(`[Scheduler] Vnstock listing metadata job initialized (${process.env.VNSTOCK_LISTING_SYNC_CRON || '15 15 * * 1-5'})`);
        }
        if (startQuoteFreshnessJob({ logger })) {
          logger.info(`[Scheduler] Quote freshness probe initialized (${process.env.QUOTE_FRESHNESS_CRON || '35 9,13 * * 1-5'})`);
        }
        if (startForecastLiveCycleJob({ logger })) {
          logger.info(`[Scheduler] Forecast live cycle initialized (${process.env.FORECAST_LIVE_CYCLE_CRON || '30 16 * * 1-5'})`);
        }
        if (startForeignFlowJob({ logger })) {
          logger.info(`[Scheduler] Foreign-flow ingestion initialized (${process.env.VNSTOCK_FOREIGN_FLOW_CRON || '0 17 * * 1-5'})`);
        }
        if (startCompanyDataSnapshotJob({ logger })) {
          logger.info(`[Scheduler] Company data snapshots initialized (${process.env.COMPANY_DATA_CRON || '30 18 * * 1-5'})`);
        }
      }

      return app;
    } catch (error) {
      logger.error(`[Startup Error] ${error.message}`);
      throw error;
    }
  })();

  return initPromise;
}

async function ensureAppInitialized() {
  if (app._stockRoutesMounted) return app;
  return initializeApp();
}

async function start() {
  try {
    await ensureAppInitialized();

    await new Promise((resolve, reject) => {
      const server = app.listen(PORT);
      server.once('error', reject);
      server.once('listening', () => {
        server.removeListener('error', reject);
        resolve();
      });
    });

    logger.info(`[Server] Running on port ${PORT}`);
    logger.info(`[Environment] ${process.env.NODE_ENV}`);
  } catch (error) {
    logger.error(error.code === 'EADDRINUSE'
      ? `[Startup Error] Port ${PORT} is already in use. Choose another PORT or stop the intended server.`
      : `[Startup Error] ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  if (isLocalServerProcess) {
    start();
  } else {
    ensureAppInitialized().catch((error) => {
      logger.error(`[Vercel Bootstrap] ${error.message}`);
    });
  }
}

module.exports = app;
module.exports.start = start;
module.exports.initializeApp = initializeApp;
module.exports.ensureAppInitialized = ensureAppInitialized;
