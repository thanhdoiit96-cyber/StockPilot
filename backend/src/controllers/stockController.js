const express = require('express');
const { Op } = require('sequelize');
const requireAdmin = require('../middleware/requireAdmin');
const Joi = require('joi');
const { analyzePrices, buildCombinedInsight, buildExternalFactorSummary, buildEvaluationFactors, buildHorizonAdvice, buildExpertGuidance } = require('../services/technicalAnalysis');
const { evaluateInsightQuality } = require('../services/analysisQuality');
const { buildRiskPlan } = require('../services/riskPlan');
const { sectorFromIndustry, industryCondition } = require('../services/sectorClassifier');
const { SECTOR_CODES, SECTOR_LABELS, CLASSIFIED_CODES, sectorForCode } = require('../services/sectorCatalog');
const fs = require('node:fs');
const path = require('node:path');
const { getEodRetryStatus } = require('../jobs/vnstockEodJob');
const sectorForStock = stock => sectorForCode(stock?.code) || sectorFromIndustry(stock?.industry) || 'other';

module.exports = function(cacheService) {
  const { Stock, StockPrice, ExternalFactor } = require('../models');
  const router = express.Router();
  const liveQuoteService = require('../services/liveQuoteService').liveQuoteService;
  const loadQuotes = symbols => liveQuoteService.load(symbols, { waitMs: 11000 });

  router.get('/sectors', async (req, res) => {
    const data = Object.keys(SECTOR_CODES).map(key => ({ key, label: SECTOR_LABELS[key] }));
    return res.json({ success: true, data, fallback: { key: 'other', label: 'Khác / chưa phân loại' } });
  });

  router.get('/data-quality', async (req, res) => {
    try {
      const requestedSession = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.session || '')) ? String(req.query.session) : null;
      const [summaryRows] = await Stock.sequelize.query(`
        WITH listed AS (
          SELECT id, code FROM stocks WHERE listing_status = 'listed'
        ), latest AS (
          SELECT COALESCE($1::date, MAX((observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)) AS session_date
          FROM stock_prices WHERE provider = 'vnstock' AND interval = '1d' AND observed_at IS NOT NULL
        ), coverage AS (
          SELECT l.code, l.id, EXISTS (
            SELECT 1 FROM stock_prices p WHERE p.stock_id = l.id AND p.provider = 'vnstock' AND p.interval = '1d'
              AND (p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = latest.session_date
          ) AS covered
          FROM listed l CROSS JOIN latest
        )
        SELECT latest.session_date::text AS session_date,
          (SELECT COUNT(*)::int FROM listed) AS listed,
          COUNT(*) FILTER (WHERE coverage.covered)::int AS covered,
          COUNT(*) FILTER (WHERE NOT coverage.covered)::int AS missing,
          ARRAY_REMOVE(ARRAY_AGG(coverage.code ORDER BY coverage.code) FILTER (WHERE NOT coverage.covered), NULL) AS missing_symbols
        FROM latest CROSS JOIN coverage GROUP BY latest.session_date
      `, { bind: [requestedSession] });
      const summary = summaryRows[0] || { session_date: null, listed: 0, covered: 0, missing: 0, missing_symbols: [] };
      const [breakdownRows] = summary.session_date ? await Stock.sequelize.query(`
        WITH latest AS (
          SELECT s.id, MAX((p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) AS last_date
          FROM stocks s LEFT JOIN stock_prices p ON p.stock_id = s.id AND p.provider = 'vnstock' AND p.interval = '1d'
          WHERE s.listing_status = 'listed' AND NOT EXISTS (
            SELECT 1 FROM stock_prices current_price WHERE current_price.stock_id = s.id AND current_price.provider = 'vnstock' AND current_price.interval = '1d'
              AND (current_price.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = $1::date
          ) GROUP BY s.id
        )
        SELECT COUNT(*) FILTER (WHERE last_date IS NULL)::int AS never_seen,
          COUNT(*) FILTER (WHERE last_date = ($1::date - INTERVAL '1 day')::date)::int AS previous_session,
          COUNT(*) FILTER (WHERE last_date < ($1::date - INTERVAL '1 day')::date)::int AS stale_history
        FROM latest
      `, { bind: [summary.session_date] }) : [[]];
      const breakdown = breakdownRows?.[0] || { never_seen: 0, previous_session: 0, stale_history: 0 };
      const health = liveQuoteService.health();
      let lastEodRun = null;
      try {
        const evidenceDir = path.resolve(__dirname, '../../evidence');
        const files = fs.existsSync(evidenceDir)
          ? fs.readdirSync(evidenceDir).filter(file => file.startsWith(`eod-scheduled-${summary.session_date}-`) && file.endsWith('.json')).sort().reverse()
          : [];
        if (files[0]) lastEodRun = JSON.parse(fs.readFileSync(path.join(evidenceDir, files[0]), 'utf8'));
      } catch (_) { /* evidence is optional operational metadata */ }
      const retryPasses = Math.max(0, Number(process.env.VNSTOCK_EOD_GAP_RETRIES || 2));
      const coveragePct = Number(summary.listed) ? Number((Number(summary.covered) / Number(summary.listed) * 100).toFixed(1)) : null;
      res.set('Cache-Control', 'no-store');
      return res.json({ success: true, data: {
        session_date: summary.session_date,
        listed: Number(summary.listed || 0),
        covered: Number(summary.covered || 0),
        missing: Number(summary.missing || 0),
        coverage_pct: coveragePct,
        missing_symbols: summary.missing_symbols || [],
        missing_breakdown: {
          never_seen: Number(breakdown.never_seen || 0),
          previous_session: Number(breakdown.previous_session || 0),
          stale_history: Number(breakdown.stale_history || 0)
        },
        ready: Number(summary.missing || 0) === 0,
        provider: health,
        eod_retry: {
          mode: 'scheduled',
          schedule: process.env.VNSTOCK_EOD_CRON || '30 16 * * 1-5',
          gap_schedule: process.env.VNSTOCK_EOD_GAP_RETRY_CRON || '*/15 17-19 * * 1-5',
          configured_passes: retryPasses,
          last_run_at: lastEodRun?.checked_at || null,
          last_run_passes: Array.isArray(lastEodRun?.retries) ? lastEodRun.retries.length : 0,
          last_run_remaining: lastEodRun?.after?.missing_symbols?.length ?? null,
          last_run_complete: lastEodRun?.complete ?? null,
          runtime: getEodRetryStatus()
        }
      } });
    } catch (error) {
      console.error('[Stock Controller] Error checking market data quality:', error);
      return res.status(500).json({ success: false, message: 'Unable to inspect market data quality' });
    }
  });

  const normalizeStock = (stock, latestSessionDate = null) => {
    const priceRecord = stock.prices?.[0];
    const latestPrice = priceRecord?.close != null ? Number(priceRecord.close) : priceRecord?.price != null ? Number(priceRecord.price) : null;
    const observedAt = priceRecord?.observed_at || priceRecord?.updated_at || null;
    const dataSessionDate = observedAt ? new Date(observedAt).toISOString().slice(0, 10) : null;

    return {
      id: stock.id,
      code: stock.code,
      name: stock.name,
      industry: stock.industry,
      exchange: stock.exchange || null,
      listing_status: stock.listing_status || 'unknown',
      listing_checked_at: stock.listing_checked_at || null,
      sector: sectorForStock(stock),
      sector_label: SECTOR_LABELS[sectorForStock(stock)] || 'Khác',
      market_cap: stock.market_cap != null ? Number(stock.market_cap) : 0,
      price: latestPrice,
      price_updated_at: observedAt,
      price_observed_at: observedAt,
      change: null,
      volume: priceRecord?.volume != null ? Number(priceRecord.volume) : null,
      data_source: priceRecord?.provider || null,
      data_fetched_at: priceRecord?.fetched_at || null,
      data_session_date: dataSessionDate,
      data_is_stale: Boolean(latestSessionDate && dataSessionDate && dataSessionDate !== latestSessionDate),
      currency: priceRecord?.currency || null,
      price_unit: priceRecord?.price_unit || null
    };
  };

  router.get('/', async (req, res) => {
    try {
      const page = Math.max(1, Number(req.query.page || 1));
      // Bound the universe request while supporting a VNINDEX-sized universe.
      const pageSize = Math.min(500, Math.max(1, Number(req.query.pageSize || 200)));
      const query = String(req.query.q || '').trim();
      const coverage = ['ready', 'incomplete'].includes(String(req.query.coverage)) ? String(req.query.coverage) : '';
      const requestedSector = String(req.query.sector || '').trim();
      const sector = Object.prototype.hasOwnProperty.call(SECTOR_CODES, requestedSector) || requestedSector === 'other' ? requestedSector : '';
      const requestedExchange = String(req.query.exchange || '').trim().toUpperCase();
      const exchange = ['HSX', 'HNX', 'UPCOM'].includes(requestedExchange) ? requestedExchange : '';
      const requestedSort = String(req.query.sort || 'name');
      const sort = ['code', 'name', 'price', 'volume'].includes(requestedSort) ? requestedSort : 'name';
      const direction = String(req.query.direction || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
      // Pin order is a display preference, not an authorization or ownership claim.
      const pinned = [...new Set(String(req.query.pinned || '').toUpperCase().split(',').map(code => code.trim()).filter(code => /^[A-Z0-9]{1,10}$/.test(code)))].sort().slice(0, 200);
      const filters = [];
      if (query) filters.push({ [Op.or]: [{ code: { [Op.iLike]: `%${query}%` } }, { name: { [Op.iLike]: `%${query}%` } }] });
      if (sector === 'other') filters.push({ code: { [Op.notIn]: CLASSIFIED_CODES } });
      else if (sector) filters.push({ [Op.or]: [{ code: { [Op.in]: SECTOR_CODES[sector] } }, industryCondition(Op, sector)] });
      if (exchange) filters.push({ exchange });
      if (coverage) filters.push(Stock.sequelize.literal(`(SELECT COUNT(*) FROM stock_prices AS coverage_prices WHERE coverage_prices.stock_id = "Stock"."id") ${coverage === 'ready' ? '>=' : '<'} 50`));
      const where = filters.length === 1 ? filters[0] : filters.length ? { [Op.and]: filters } : undefined;
      const cacheKey = `v9:stocks:${page}:${pageSize}:${sort}:${direction}:${coverage}:${sector}:${exchange}:${query.toLowerCase()}:${pinned.join(',')}`;
      let cached = await cacheService.get(cacheKey);
      if (cached) return res.json({ success: true, data: cached.data, pagination: cached.pagination, source: 'cache' });
      const latestValue = field => Stock.sequelize.literal(`(SELECT COALESCE(sp.${field === 'price' ? 'close' : field}, sp.${field === 'price' ? 'price' : field}) FROM stock_prices AS sp WHERE sp.stock_id = "Stock"."id" AND sp.observed_at IS NOT NULL ORDER BY sp.observed_at DESC NULLS LAST, sp.id DESC LIMIT 1)`);
      const orderColumn = sort === 'price' || sort === 'volume' ? latestValue(sort) : sort;
      const order = sort === 'price' || sort === 'volume' ? [[Stock.sequelize.literal(`CASE WHEN ${latestValue(sort).val} IS NULL THEN 1 ELSE 0 END`), 'ASC'], [orderColumn, direction]] : [[orderColumn, direction]];
      if (pinned.length) order.unshift([Stock.sequelize.literal(`CASE WHEN "Stock"."code" IN (${pinned.map(code => `'${code}'`).join(',')}) THEN 0 ELSE 1 END`), 'ASC']);
      if (sort !== 'code') order.push(['code', 'ASC']);
      const queryOptions = { where, include: [{ association: 'prices', separate: true, where: { observed_at: { [Op.not]: null } }, limit: 1, order: [['observed_at', 'DESC NULLS LAST'], ['updated_at', 'DESC NULLS LAST'], ['id', 'DESC']] }], order, limit: pageSize, offset: (page - 1) * pageSize, distinct: true };
      let latestSessionDate = null;
      try {
        const [sessionRows] = await Stock.sequelize.query("SELECT MAX((observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::text AS session_date FROM stock_prices WHERE provider='vnstock' AND interval='1d' AND observed_at IS NOT NULL");
        latestSessionDate = sessionRows?.[0]?.session_date || null;
      } catch (_) { /* freshness metadata is additive; do not fail the stock list */ }
      const result = typeof Stock.findAndCountAll === 'function'
        ? await Stock.findAndCountAll(queryOptions)
        : { rows: await Stock.findAll(queryOptions), count: 0 };

      const payload = result.rows.map(stock => normalizeStock(stock, latestSessionDate));
      const pagination = { page, pageSize, total: result.count, totalPages: Math.max(1, Math.ceil(result.count / pageSize)), query, coverage, sector, exchange, sort, direction: direction.toLowerCase() };
      await cacheService.set(cacheKey, { data: payload, pagination }, 5, 'stock');

      res.json({ success: true, data: payload, pagination, source: 'database' });
    } catch (error) {
      console.error('[Stock Controller] Error fetching stocks:', error);
      res.status(500).json({ success: false, message: 'Error fetching stocks' });
    }
  });

  router.get('/:id/analysis', async (req, res) => {
    try {
      const stock = await Stock.findByPk(req.params.id, { include: [{ association: 'prices', separate: true, where: { observed_at: { [Op.not]: null } }, order: [['observed_at', 'ASC NULLS LAST'], ['updated_at', 'ASC NULLS LAST'], ['id', 'ASC']], limit: 250 }] });
      if (!stock) return res.status(404).json({ success: false, message: 'Stock not found' });
      const rows = (stock.prices || []).map(entry => ({ close: entry.close ?? entry.price, price: entry.price, observed_at: entry.observed_at || entry.updated_at, fetched_at: entry.fetched_at || entry.updated_at || null, provider: entry.provider || null }));
      const analysisCacheKey = `v1:stock-analysis:${stock.id}:${rows.at(-1)?.observed_at || 'none'}:${rows.length}`;
      const cachedAnalysis = await cacheService.get(analysisCacheKey);
      if (cachedAnalysis?.data && String(req.query.refresh || '') !== '1') return res.json({ success: true, data: cachedAnalysis.data, source: 'cache' });
      const verifiedFactors = await ExternalFactor.findAll({ where: { status: 'verified', [Op.or]: [{ symbol: stock.code }, { symbol: null }] }, order: [['published_at', 'DESC']], limit: 20 });
      const analysis = analyzePrices(rows);
      const externalFactors = verifiedFactors.map(item => item.toJSON());
      const insight = buildCombinedInsight(analysis, externalFactors);
      const quality = evaluateInsightQuality({ analysis: { ...analysis, insight }, externalFactors });
      const riskPlan = buildRiskPlan(rows, quality);
      const data = { symbol: stock.code, ...analysis, insight, quality, risk_plan: riskPlan, evaluation_factors: buildEvaluationFactors(analysis, externalFactors), horizon_advice: buildHorizonAdvice(analysis, riskPlan), expert_guidance: buildExpertGuidance(analysis, riskPlan), external_factors: buildExternalFactorSummary(externalFactors), source: rows[0]?.provider || null, fetched_at: rows.at(-1)?.fetched_at || null };
      await cacheService.set(analysisCacheKey, { data }, 5, 'stock_analysis');
      return res.json({ success: true, data, source: 'database' });
    } catch (error) { console.error('[Stock Controller] Error analyzing stock:', error); return res.status(500).json({ success: false, message: 'Error analyzing stock' }); }
  });

  router.get('/:id/quote', async (req, res) => {
    try {
      const stock = await Stock.findByPk(req.params.id);
      if (!stock) return res.status(404).json({ success: false, message: 'Stock not found' });
      if (String(process.env.REALTIME_QUOTES_ENABLED || 'true').toLowerCase() === 'false') {
        return res.status(503).json({ success: false, message: 'Realtime quotes are disabled' });
      }
      const quote = (await loadQuotes([stock.code]))[stock.code];
      if (!quote) return res.status(503).json({ success: false, message: 'No intraday quote available', code: 'quote_unavailable' });
      res.set('Cache-Control', 'no-store');
      return res.json({ success: true, data: { ...quote, stock_id: stock.id, stock_code: stock.code } });
    } catch (error) {
      console.error('[Stock Controller] Error fetching intraday quote:', error);
      return res.status(503).json({ success: false, message: 'Realtime quote provider unavailable', code: 'quote_provider_unavailable' });
    }
  });

  router.get('/quotes', async (req, res) => {
    try {
      if (String(process.env.REALTIME_QUOTES_ENABLED || 'true').toLowerCase() === 'false') {
        return res.status(503).json({ success: false, message: 'Realtime quotes are disabled' });
      }
      const symbols = String(req.query.symbols || '').split(',').map(item => item.trim().toUpperCase()).filter(symbol => /^[A-Z0-9]{1,10}$/.test(symbol)).slice(0, 200);
      if (!symbols.length) return res.status(400).json({ success: false, message: 'At least one symbol is required' });
      const quotes = await loadQuotes(symbols);
      res.set('Cache-Control', 'no-store');
      return res.json({ success: true, data: quotes, requested: symbols.length, returned: Object.keys(quotes).length });
    } catch (error) {
      console.error('[Stock Controller] Error fetching intraday quotes:', error);
      return res.status(503).json({ success: false, message: 'Realtime quote provider unavailable', code: 'quote_provider_unavailable' });
    }
  });

  router.get('/quotes/status', async (req, res) => {
    try {
      if (String(process.env.REALTIME_QUOTES_ENABLED || 'true').toLowerCase() === 'false') {
        return res.status(503).json({ success: false, message: 'Realtime quotes are disabled' });
      }
      res.set('Cache-Control', 'no-store');
      return res.json({ success: true, data: liveQuoteService.health() });
    } catch (error) {
      console.error('[Stock Controller] Error fetching intraday provider status:', error);
      return res.status(500).json({ success: false, message: 'Unable to inspect realtime quote provider' });
    }
  });

  router.get('/:id/external-factors', async (req, res) => {
    try {
      const stock = await Stock.findByPk(req.params.id);
      if (!stock) return res.status(404).json({ success: false, message: 'Stock not found' });
      const factors = await ExternalFactor.findAll({ where: { [Op.or]: [{ symbol: stock.code }, { symbol: null }] }, order: [['published_at', 'DESC']], limit: 50 });
      return res.json({ success: true, data: factors.map(item => item.toJSON()), verified: factors.filter(item => item.status === 'verified').length });
    } catch (error) { console.error('[Stock Controller] Error fetching external factors:', error); return res.status(500).json({ success: false, message: 'Error fetching external factors' }); }
  });

  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const cacheKey = `v7:stock:${id}`;
      let stock = await cacheService.get(cacheKey);

      if (stock) {
        return res.json({ success: true, data: stock, source: 'cache' });
      }

      stock = await Stock.findByPk(id, {
        include: [
          { association: 'prices', separate: true, where: { observed_at: { [Op.not]: null }, interval: '1d' }, order: [['observed_at', 'DESC NULLS LAST'], ['updated_at', 'DESC NULLS LAST'], ['id', 'DESC']], limit: 60 }
        ]
      });

      if (!stock) {
        return res.status(404).json({ success: false, message: 'Stock not found' });
      }

      const [marketSessionRows] = await Stock.sequelize.query(`
        SELECT DISTINCT (p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date::text AS session_date
        FROM stock_prices p
        WHERE p.provider = 'vnstock' AND p.interval = '1d' AND p.observed_at IS NOT NULL
        ORDER BY session_date DESC
        LIMIT 3
      `);

      // The chart is session based. Keep intraday rows out of the EOD history
      // even if a legacy/cache adapter returns mixed intervals.
      const eodPrices = (stock.prices || []).filter(entry => !entry.interval || entry.interval === '1d');

      const payload = {
        ...normalizeStock(stock),
        market_sessions: marketSessionRows.map(row => row.session_date).reverse(),
        price_history: eodPrices.map((entry) => ({
          open: entry.open != null ? Number(entry.open) : null,
          high: entry.high != null ? Number(entry.high) : null,
          low: entry.low != null ? Number(entry.low) : null,
          price: Number(entry.close ?? entry.price),
          close: entry.close != null ? Number(entry.close) : Number(entry.price),
          volume: entry.volume != null ? Number(entry.volume) : null,
          trade_count: entry.trade_count != null ? Number(entry.trade_count) : null,
          traded_value: entry.traded_value != null ? Number(entry.traded_value) : null,
          reference_price: entry.reference_price != null ? Number(entry.reference_price) : null,
          ceiling_price: entry.ceiling_price != null ? Number(entry.ceiling_price) : null,
          floor_price: entry.floor_price != null ? Number(entry.floor_price) : null,
          observed_at: entry.observed_at || entry.updated_at,
          interval: entry.interval || '1d',
          fetched_at: entry.fetched_at || null,
          provider: entry.provider || null,
          currency: entry.currency || null,
          price_unit: entry.price_unit || null
        }))
      };

      await cacheService.set(cacheKey, payload, 5, 'stock');
      res.json({ success: true, data: payload, source: 'database' });
    } catch (error) {
      console.error('[Stock Controller] Error fetching stock:', error);
      res.status(500).json({ success: false, message: 'Error fetching stock' });
    }
  });

  router.get('/:id/price', async (req, res) => {
    try {
      const { id } = req.params;
      const cacheKey = `stock:price:${id}`;
      let priceData = await cacheService.get(cacheKey);

      if (priceData) {
        return res.json({ success: true, data: priceData, source: 'cache' });
      }

      const stock = await Stock.findByPk(id);
      if (!stock) {
        return res.status(404).json({ success: false, message: 'Stock not found' });
      }

      const price = await StockPrice.findOne({
        where: { stock_id: id, observed_at: { [Op.not]: null } },
        order: [['observed_at', 'DESC NULLS LAST'], ['updated_at', 'DESC NULLS LAST'], ['id', 'DESC']]
      });

      priceData = {
        stock_id: id,
        stock_code: stock.code,
        price: price?.price != null ? Number(price.price) : null,
        updated_at: price?.updated_at || null
      };

      await cacheService.set(cacheKey, priceData, 1, 'stock_price');
      res.json({ success: true, data: priceData, source: 'database' });
    } catch (error) {
      console.error('[Stock Controller] Error fetching price:', error);
      res.status(500).json({ success: false, message: 'Error fetching price' });
    }
  });

  router.put('/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { error: validationError, value } = Joi.object({
        name: Joi.string().trim().max(255),
        code: Joi.string().trim().max(50),
        industry: Joi.string().trim().max(255).allow(null),
        market_cap: Joi.number().min(0).allow(null)
      }).min(1).validate(req.body);
      if (validationError) return res.status(400).json({ success: false, message: validationError.message });
      const stock = await Stock.findByPk(id);

      if (!stock) {
        return res.status(404).json({ success: false, message: 'Stock not found' });
      }

      await stock.update({ ...value, updated_at: new Date() });
      await cacheService.delete(`v4:stock:${id}`);
      await cacheService.delete(`stock:price:${id}`);
      await cacheService.deleteByType('stock');

      res.json({ success: true, data: stock, message: 'Stock updated and cache invalidated' });
    } catch (error) {
      console.error('[Stock Controller] Error updating stock:', error);
      res.status(500).json({ success: false, message: 'Error updating stock' });
    }
  });

  router.get('/cache/stats', async (req, res) => {
    try {
      const stats = await cacheService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('[Stock Controller] Error fetching cache stats:', error);
      res.status(500).json({ success: false, message: 'Error fetching cache stats' });
    }
  });

  router.post('/cache/clear', requireAdmin, async (req, res) => {
    try {
      await cacheService.clearAll();
      res.json({ success: true, message: 'Cache cleared' });
    } catch (error) {
      console.error('[Stock Controller] Error clearing cache:', error);
      res.status(500).json({ success: false, message: 'Error clearing cache' });
    }
  });

  return router;
};


