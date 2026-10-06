// Real PostgreSQL checks in a disposable schema; never uses public for test queries.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { Sequelize, DataTypes } = require('sequelize');
const express = require('express');
const request = require('supertest');
const CacheService = require('../src/services/cacheService');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const schema = `verify_${randomUUID().replaceAll('-', '')}`;
assert.match(schema, /^verify_[a-f0-9]{32}$/);
const settings = {
  host: process.env.DB_HOST, port: process.env.DB_PORT, dialect: 'postgres', logging: false
};
const connect = options => new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, { ...settings, ...options });
const admin = connect({});
const db = connect({ dialectOptions: { options: `-c search_path=${schema}` } });
let created = false;
const modelPath = require.resolve('../src/models');
const previousModels = require.cache[modelPath];
const previousKey = process.env.ADMIN_API_KEY;
process.env.VERIFY_POSTGRES_SCHEMA = schema;

async function main() {
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    const [location] = await db.query('SELECT current_schema() AS name', { type: Sequelize.QueryTypes.SELECT });
    assert.equal(location.name, schema);
    for (const file of ['001_create_system_cache', '002_create_stocks', '003_create_stock_prices', '004_expand_market_data_contract', '005_create_market_data_ingestion_runs', '006_create_market_data_reconciliation_runs', '007_create_users_watchlist', '008_create_portfolios', '012_add_portfolio_recommendation_context', '013_add_stock_listing_metadata', '014_add_stock_listing_checked_at', '015_add_market_breadth_metrics', '024_create_portfolio_cash_flows']) {
      await require(`../src/migrations/${file}`).up(db.getQueryInterface(), Sequelize);
    }
    console.log('PASS: isolated core schema migrations, recommendation provenance, and stock listing metadata migrations');

    const Stock = require('../src/models/Stock')(db, DataTypes);
    const StockPrice = require('../src/models/StockPrice')(db, DataTypes);
    // Keep this isolated verifier aligned with its deliberately minimal users
    // schema instead of loading profile/auth fields from later migrations.
    const User = db.define('User', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      email: { type: DataTypes.STRING(255), allowNull: false },
      password_hash: { type: DataTypes.STRING(255), allowNull: false },
      role: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'user' }
    }, { tableName: 'users', underscored: true, timestamps: false });
    const WatchlistItem = require('../src/models/WatchlistItem')(db, DataTypes);
    const Portfolio = require('../src/models/Portfolio')(db, DataTypes);
    const PortfolioTransaction = require('../src/models/PortfolioTransaction')(db, DataTypes);
    const PortfolioCashFlow = require('../src/models/PortfolioCashFlow')(db, DataTypes);
    const models = { Stock, StockPrice, User, WatchlistItem, Portfolio, PortfolioTransaction, PortfolioCashFlow };
    Stock.associate(models);
    StockPrice.associate(models);
    WatchlistItem.associate(models);
    Portfolio.associate(models);
    PortfolioTransaction.associate(models);
    PortfolioCashFlow.associate(models);
    // Use production router with real models bound to the isolated connection.
    require.cache[modelPath] = { id: modelPath, filename: modelPath, loaded: true, exports: models };
    const cache = new CacheService(db);
    const FixtureMarketDataAdapter = require('../src/market-data/adapters/FixtureMarketDataAdapter');
    const { MarketDataIngestionService } = require('../src/market-data/marketDataIngestionService');
    const MarketDataIngestionRun = require('../src/models/MarketDataIngestionRun')(db, DataTypes);
    const fixtureAdapter = new FixtureMarketDataAdapter();
    const ingestion = new MarketDataIngestionService({ Stock, StockPrice, MarketDataIngestionRun, sequelize: db, cacheService: cache });
    process.env.ADMIN_API_KEY = randomUUID();
    const app = express();
    app.use(express.json());
    app.use('/api/stocks', require('../src/controllers/stockController')(cache));
    app.use('/api/portfolio', require('../src/controllers/portfolioController'));

    await cache.set('ttl', { value: 'expires' }, 1 / 60, 'verification');
    assert.deepEqual(await cache.get('ttl'), { value: 'expires' });
    await db.query('SELECT pg_sleep(1.1)');
    assert.equal(await cache.get('ttl'), null);
    assert.equal(await cache.cleanupExpired(), 1);
    console.log('PASS: real-time TTL expiry and expired-row cleanup');

    const listingCheckedAt = new Date('2026-09-22T08:00:00Z');
    const stock = await Stock.create({ code: 'VERIFY', name: 'Before update', exchange: 'UPCOM', listing_status: 'listed', listing_checked_at: listingCheckedAt });
    await StockPrice.create({ stock_id: stock.id, price: 12345 });
    const urls = ['/api/stocks', `/api/stocks/${stock.id}`, `/api/stocks/${stock.id}/price`];
    for (const url of urls) {
      assert.equal((await request(app).get(url).expect(200)).body.source, 'database');
      assert.equal((await request(app).get(url).expect(200)).body.source, 'cache');
    }
    const stockDetail = (await request(app).get(`/api/stocks/${stock.id}`).expect(200)).body.data;
    assert.equal(stockDetail.exchange, 'UPCOM');
    assert.equal(stockDetail.listing_status, 'listed');
    assert.equal(new Date(stockDetail.listing_checked_at).toISOString(), listingCheckedAt.toISOString());
    console.log('PASS: list/detail/price database miss then cache hit');

    const fixtureRecords = await fixtureAdapter.fetchQuotes({ symbols: ['FPT'] });
    // The fixture symbol is inserted only in the isolated schema; the application schema is untouched.
    await Stock.create({ code: 'FPT', name: 'Fixture FPT' });
    const firstIngest = await ingestion.ingest(fixtureRecords);
    const duplicateIngest = await ingestion.ingest(fixtureRecords);
    assert.equal(firstIngest.inserted, 1);
    assert.equal(duplicateIngest.skipped, 1);
    console.log('PASS: fixture adapter canonicalizes data and ingestion skips identical duplicates');
    const auditRun = await MarketDataIngestionRun.findOne({ where: { inserted: 1 }, order: [['started_at', 'DESC']] });
    assert.equal(auditRun.status, 'success');
    assert.equal(auditRun.inserted, 1);
    console.log('PASS: ingestion audit records status and counters');

    const userA = await User.create({ email: 'a@example.test', password_hash: 'hash-a' });
    const userB = await User.create({ email: 'b@example.test', password_hash: 'hash-b' });
    await WatchlistItem.create({ user_id: userA.id, stock_id: stock.id });
    assert.equal((await WatchlistItem.findAll({ where: { user_id: userA.id } })).length, 1);
    assert.equal((await WatchlistItem.findAll({ where: { user_id: userB.id } })).length, 0);
    console.log('PASS: watchlist ownership is isolated per user');

    const portfolio = await Portfolio.create({ user_id: userA.id, name: 'Danh mục kiểm thử' });
    await PortfolioCashFlow.create({ portfolio_id: portfolio.id, type: 'DEPOSIT', amount: 2000, occurred_at: new Date('2026-08-31'), note: 'Vốn kiểm thử' });
    const recommendationContext = { source: 'personalized', generated_at: '2026-09-01T00:00:00.000Z', horizon_days: 20, score: 82, expected_entry_price: 10 };
    await PortfolioTransaction.create({ portfolio_id: portfolio.id, stock_id: stock.id, side: 'BUY', quantity: 100, price: 10, fees: 5, traded_at: new Date('2026-09-01'), recommendation_context: recommendationContext });
    await PortfolioTransaction.create({ portfolio_id: portfolio.id, stock_id: stock.id, side: 'SELL', quantity: 20, price: 12, fees: 2, traded_at: new Date('2026-09-02') });
    const transactions = await PortfolioTransaction.findAll({ where: { portfolio_id: portfolio.id }, order: [['traded_at', 'ASC']] });
    assert.deepEqual(transactions[0].recommendation_context, recommendationContext);
    const bought = Number(transactions[0].quantity); const sold = Number(transactions[1].quantity); const cost = Number(transactions[0].quantity) * Number(transactions[0].price) + Number(transactions[0].fees); const quantity = bought - sold; const average = cost / bought; const realized = sold * (Number(transactions[1].price) - average) - Number(transactions[1].fees);
    assert.equal(quantity, 80); assert.ok(Math.abs(average - 10.05) < 1e-9); assert.ok(Math.abs(realized - 37) < 1e-9);
    assert.equal(Number((await PortfolioCashFlow.findOne({ where: { portfolio_id: portfolio.id } })).amount), 2000);
    const userBPortfolio = await Portfolio.findOne({ where: { user_id: userB.id } });
    assert.equal(userBPortfolio, null);
    console.log('PASS: portfolio ledger calculates quantity, average cost, and realized P&L');

    const jwt = require('jsonwebtoken');
    const userAToken = jwt.sign({ sub: userA.id, email: userA.email, role: 'user' }, process.env.JWT_SECRET || 'development-only-change-me');
    const transactionDate = new Date(Date.now() - 86400000).toISOString();
    await StockPrice.create({ stock_id: stock.id, price: 12345, close: 12345, observed_at: new Date(), provider: 'verification' });
    const recorded = await request(app).post('/api/portfolio/transactions').set('Authorization', `Bearer ${userAToken}`).send({ symbol: 'VERIFY', side: 'BUY', quantity: 2, price: 12000, recommendation_context: { source: 'personalized', model: 'personalized_rule_v1', generated_at: transactionDate, horizon_days: 1, score: 81, rank: 1, expected_entry_price: 12000, criteria: { trend: 30, momentum: 25 } } }).expect(201);
    const portfolioView = (await request(app).get('/api/portfolio').set('Authorization', `Bearer ${userAToken}`).expect(200)).body.data;
    const tracked = portfolioView.recommendation_entries.find(item => item.transaction_id === recorded.body.data.id);
    assert.ok(tracked);
    assert.equal(tracked.recommendation.score, 81);
    assert.equal(tracked.evaluation.status, 'evaluated');
    assert.equal(tracked.evaluation.outcome, 'positive');
    assert.deepEqual(portfolioView.performance.external_cash_flows, { count: 1, deposits: 2000, withdrawals: 0, net: 2000 });
    const userBToken = jwt.sign({ sub: userB.id, email: userB.email, role: 'user' }, process.env.JWT_SECRET || 'development-only-change-me');
    const otherPortfolio = (await request(app).get('/api/portfolio').set('Authorization', `Bearer ${userBToken}`).expect(200)).body.data;
    assert.equal(otherPortfolio.recommendation_entries.length, 0);
    assert.equal(otherPortfolio.cash_flows.length, 0);
    console.log('PASS: linked recommendation is horizon-evaluated and remains private to its portfolio owner');

    const keys = ['v11:stocks:1:200:name:ASC::::::', `v7:stock:${stock.id}`, `stock:price:${stock.id}`];
    for (const url of urls) {
      const expectedSource = url.endsWith('/price') ? 'cache' : 'database';
      assert.equal((await request(app).get(url).expect(200)).body.source, expectedSource);
    }
    for (const key of keys) assert.notEqual(await cache.get(key), null, `Expected cache key to exist: ${key}`);
    await request(app).put(`/api/stocks/${stock.id}`).send({ name: 'Denied' }).expect(401);
    await request(app).put(`/api/stocks/${stock.id}`)
      .set('Authorization', `Bearer ${process.env.ADMIN_API_KEY}`).send({ market_cap: -1 }).expect(400);
    assert.equal((await Stock.findByPk(stock.id)).name, 'Before update');
    console.log('PASS: unauthorized and invalid updates do not mutate the stock');

    await cache.set('unrelated', { keep: true }, 5, 'verification');
    await request(app).put(`/api/stocks/${stock.id}`)
      .set('Authorization', `Bearer ${process.env.ADMIN_API_KEY}`)
      .send({ name: 'After update', code: 'VERIFIED' }).expect(200);
    for (const key of keys) assert.equal(await cache.get(key), null);
    assert.deepEqual(await cache.get('unrelated'), { keep: true });
    for (const url of urls) {
      const result = (await request(app).get(url).expect(200)).body;
      assert.equal(result.source, 'database');
      if (url.endsWith('/price')) assert.equal(result.data.stock_code, 'VERIFIED');
      else assert.equal((Array.isArray(result.data) ? result.data[0] : result.data).name, 'After update');
      assert.equal((await request(app).get(url).expect(200)).body.source, 'cache');
    }
    console.log('PASS: PUT invalidates all affected keys; next reads repopulate updated data');
  } finally {
    if (previousModels) require.cache[modelPath] = previousModels;
    else delete require.cache[modelPath];
    delete process.env.VERIFY_POSTGRES_SCHEMA;
    if (previousKey === undefined) delete process.env.ADMIN_API_KEY;
    else process.env.ADMIN_API_KEY = previousKey;
    await db.close();
    try {
      // Only the unique schema successfully created by this run is eligible.
      if (created) {
        await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
        const rows = await admin.query('SELECT 1 FROM pg_namespace WHERE nspname = $1', {
          bind: [schema], type: Sequelize.QueryTypes.SELECT
        });
        assert.equal(rows.length, 0);
        console.log('PASS: isolated schema removed; existing application schema untouched');
      }
    } finally { await admin.close(); }
  }
}

main().catch(error => {
  console.error('PostgreSQL verification failed:', error.message);
  process.exitCode = 1;
});
