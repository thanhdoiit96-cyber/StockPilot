'use strict';
const express = require('express');
const { Op } = require('sequelize');
const { Portfolio, PortfolioTransaction, Stock, StockPrice } = require('../models');
const requireAuth = require('../middleware/requireAuth');
const { normalizeTransactionPrice, normalizeRecommendationContext, uniqueForwardSessions, evaluateRecommendationEntry, summarizePortfolioTransactions } = require('../services/portfolioAccounting');
const router = express.Router();
router.use(requireAuth);

const loadPortfolioQuotes = symbols => require('../services/liveQuoteService').liveQuoteService.load(symbols, { waitMs: 1500 });

router.get('/', async (req, res) => {
  try {
  let portfolio = await Portfolio.findOne({ where: { user_id: req.user.sub }, order: [['created_at', 'ASC']] });
  if (!portfolio) portfolio = await Portfolio.create({ user_id: req.user.sub, name: 'Danh mục chính' });
  const transactions = await PortfolioTransaction.findAll({ where: { portfolio_id: portfolio.id }, include: [{ model: Stock, attributes: ['id', 'code', 'name'] }], order: [['traded_at', 'ASC'], ['created_at', 'ASC'], ['id', 'ASC']] });
  const stocks = [...new Set(transactions.map(tx => tx.stock_id))]; const prices = new Map();
  const previousPrices = new Map();
  if (stocks.length) {
    // EOD is used only as the fallback/reference series. Never let an
    // intraday tick become the previous-session comparison price.
    const rows = await StockPrice.findAll({ where: { stock_id: stocks, interval: '1d', observed_at: { [Op.not]: null } }, order: [['observed_at', 'DESC']] });
    const sessions = new Map();
    for (const row of rows) {
      const key = String(row.stock_id); const date = new Date(row.observed_at).toISOString().slice(0, 10);
      if (!sessions.has(key)) sessions.set(key, new Set());
      if (sessions.get(key).has(date)) continue;
      sessions.get(key).add(date);
      const value = Number(row.close || row.price);
      if (!prices.has(key)) prices.set(key, value); else if (!previousPrices.has(key)) previousPrices.set(key, value);
    }
  }
  const recommendationTransactions = transactions.filter(tx => tx.side === 'BUY' && tx.recommendation_context);
  const recommendationStockIds = [...new Set(recommendationTransactions.map(tx => tx.stock_id))];
  const recommendationEntries = [];
  if (recommendationTransactions.length) {
    const startTimes = recommendationTransactions.map(tx => new Date(tx.recommendation_context.generated_at || tx.traded_at).getTime()).filter(Number.isFinite);
    const firstGeneratedAt = startTimes.length ? new Date(Math.min(...startTimes)) : new Date(0);
    const historyRows = await StockPrice.findAll({ where: { stock_id: { [Op.in]: recommendationStockIds }, observed_at: { [Op.gt]: firstGeneratedAt } }, order: [['observed_at', 'ASC'], ['id', 'ASC']], limit: 50000 });
    const byStock = new Map();
    for (const row of historyRows) { const item = row.toJSON ? row.toJSON() : row; const key = String(item.stock_id); if (!byStock.has(key)) byStock.set(key, []); byStock.get(key).push(item); }
    for (const tx of recommendationTransactions) {
      const context = tx.recommendation_context;
      const generatedAt = new Date(context.generated_at || tx.traded_at);
      const futureRows = uniqueForwardSessions(byStock.get(String(tx.stock_id)) || [], generatedAt);
      const evaluation = evaluateRecommendationEntry({ recommendation: context, actualEntryPrice: tx.price, currentEodPrice: prices.get(tx.stock_id), futureRows });
      recommendationEntries.push({
        transaction_id: tx.id,
        stock_id: tx.stock_id,
        symbol: tx.Stock?.code,
        name: tx.Stock?.name,
        quantity: Number(tx.quantity),
        traded_at: tx.traded_at,
        actual_entry_price: Number(tx.price),
        current_eod_price: prices.get(tx.stock_id) ?? null,
        recommendation: context,
        evaluation
      });
    }
  }
  let positions = summarizePortfolioTransactions(transactions, prices).map(position => {
    const previous = previousPrices.get(position.stock_id) ?? null;
    const dayChange = previous != null && position.market_price != null ? position.market_price - previous : null;
    return { ...position, previous_market_price: previous, day_change: dayChange, day_change_pct: previous ? (dayChange / previous) * 100 : null };
  });

  // Portfolio P/L must use the current VCI intraday quote whenever it is
  // available. EOD is retained only as an explicit fallback when the quote
  // provider has no valid response for a symbol.
  let currentQuotes = {};
  try {
    currentQuotes = positions.length ? await loadPortfolioQuotes(positions.map(position => position.symbol).filter(Boolean)) : {};
  } catch (error) {
    console.warn(`[Portfolio] intraday quote fallback: ${error.message}`);
  }
  positions = positions.map(position => {
    const quote = currentQuotes[String(position.symbol || '').toUpperCase()];
    if (!quote || !Number.isFinite(Number(quote.price)) || Number(quote.price) <= 0) return { ...position, price_source: 'eod' };
    const marketPrice = Number(quote.price);
    const marketValue = marketPrice * Number(position.quantity || 0);
    const previous = position.previous_market_price;
    const dayChange = previous != null ? marketPrice - previous : null;
    return {
      ...position,
      market_price: marketPrice,
      market_value: marketValue,
      unrealized_pnl: marketValue - Number(position.cost || 0),
      day_change: dayChange,
      day_change_pct: previous ? (dayChange / previous) * 100 : null,
      current_quote: quote,
      price_source: 'intraday'
    };
  });
  res.json({ success: true, data: {
    portfolio,
    positions,
    transactions: transactions.map(tx => ({
      id: tx.id,
      stock_id: tx.stock_id,
      symbol: tx.Stock?.code || null,
      name: tx.Stock?.name || null,
      side: tx.side,
      quantity: Number(tx.quantity),
      price: Number(tx.price),
      fees: Number(tx.fees || 0),
      traded_at: tx.traded_at,
      created_at: tx.created_at,
      source: tx.recommendation_context ? 'recommendation' : 'manual'
    })),
    recommendation_entries: recommendationEntries.map(entry => ({
      ...entry,
      current_quote: currentQuotes[String(entry.symbol || '').toUpperCase()] || null
    })),
    transaction_count: transactions.length
  } });
  } catch (error) {
    console.error('[Portfolio] Load failed:', error.message);
    res.status(500).json({ success: false, message: 'Không tải được danh mục. Vui lòng thử lại.' });
  }
});

router.post('/transactions', async (req, res) => {
  const side = String(req.body?.side || '').toUpperCase(); const symbol = String(req.body?.symbol || '').trim().toUpperCase(); const quantity = Number(req.body?.quantity); const rawPrice = Number(req.body?.price); const price = normalizeTransactionPrice(rawPrice); const fees = Number(req.body?.fees || 0); const tradedAt = new Date(req.body?.traded_at || Date.now());
  let recommendationContext;
  try { recommendationContext = normalizeRecommendationContext(req.body?.recommendation_context, symbol); } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  if (!['BUY', 'SELL'].includes(side) || !symbol || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0 || !Number.isFinite(fees) || fees < 0 || Number.isNaN(tradedAt.getTime()) || (recommendationContext && side !== 'BUY')) return res.status(400).json({ success: false, message: 'Giao dịch không hợp lệ' });
  let portfolio = await Portfolio.findOne({ where: { user_id: req.user.sub }, order: [['created_at', 'ASC']] }); if (!portfolio) portfolio = await Portfolio.create({ user_id: req.user.sub, name: 'Danh mục chính' });
  const stock = await Stock.findOne({ where: { code: symbol } }); if (!stock) return res.status(404).json({ success: false, message: 'Không tìm thấy mã cổ phiếu' });
  if (side === 'SELL') { const existing = await PortfolioTransaction.findAll({ where: { portfolio_id: portfolio.id, stock_id: stock.id }, order: [['traded_at', 'ASC'], ['created_at', 'ASC'], ['id', 'ASC']] }); const position = summarizePortfolioTransactions(existing, new Map()).find(item => item.stock_id === stock.id); if (!position || position.quantity < quantity) return res.status(400).json({ success: false, message: 'Số lượng bán vượt vị thế hiện có' }); }
  const transaction = await PortfolioTransaction.create({ portfolio_id: portfolio.id, stock_id: stock.id, side, quantity, price, fees, traded_at: tradedAt, recommendation_context: recommendationContext });
  res.status(201).json({ success: true, data: transaction });
});

module.exports = router;
