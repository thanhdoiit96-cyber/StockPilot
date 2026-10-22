const express = require('express');
const { Op } = require('sequelize');
const requireAdmin = require('../middleware/requireAdmin');
const Joi = require('joi');
const { analyzePrices, buildCombinedInsight, buildExternalFactorSummary, buildEvaluationFactors, buildHorizonAdvice, buildExpertGuidance } = require('../services/technicalAnalysis');
const { evaluateInsightQuality } = require('../services/analysisQuality');
const { buildRiskPlan } = require('../services/riskPlan');
const { SECTOR_INDUSTRY_LIKE, sectorFromIndustry, industryCondition } = require('../services/sectorClassifier');
const { SECTOR_CODES, SECTOR_LABELS, CLASSIFIED_CODES, sectorForCode } = require('../services/sectorCatalog');
const path = require('node:path');
const { getEodRetryStatus } = require('../jobs/vnstockEodJob');
const { readLatestEodEvidence } = require('../services/eodEvidence');
const { buildMarketBreadthHistory } = require('../services/marketBreadthHistory');
const { serializeStockCsv } = require('../services/stockCsv');
const { httpError } = require('../utils/httpError');
const { normalizeCompanyProfile, fetchCompanyProfile } = require('../services/companyProfileService');
const { normalizeCompanyPeople, fetchCompanyPeople } = require('../services/companyPeopleService');
const { normalizeCompanyCapital, fetchCompanyCapital } = require('../services/companyCapitalService');
const { normalizeCompanyFinancials, fetchCompanyFinancials } = require('../services/companyFinancialService');
const { normalizeCompanyNews, fetchCompanyNews } = require('../services/companyNewsService');
const { readLatestCompanySnapshot } = require('../services/companySnapshotStore');
const { buildLiquid30Readiness } = require('../services/liquid30Universe');
const { buildOfficialIndexReadiness } = require('../services/officialIndexUniverse');
const sectorForStock = stock => sectorForCode(stock?.code) || sectorFromIndustry(stock?.industry) || 'other';
const ALL_SECTOR_INDUSTRY_PATTERNS = [...new Set(Object.values(SECTOR_INDUSTRY_LIKE).flat())];
const sectorCondition = sector => {
  if (!sector) return null;
  if (sector === 'other') {
    const knownIndustry = { [Op.or]: ALL_SECTOR_INDUSTRY_PATTERNS.map(pattern => ({ industry: { [Op.iLike]: pattern } })) };
    return { [Op.and]: [
      { code: { [Op.notIn]: CLASSIFIED_CODES } },
      { [Op.or]: [{ industry: { [Op.is]: null } }, { industry: '' }, { [Op.not]: knownIndustry }] }
    ] };
  }
  return { [Op.or]: [
    { code: { [Op.in]: SECTOR_CODES[sector] } },
    { [Op.and]: [{ code: { [Op.notIn]: CLASSIFIED_CODES } }, industryCondition(Op, sector)] }
  ] };
};
const finiteEvidenceNumber = value => value !== null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;

module.exports = function(cacheService) {
  const { Stock, StockPrice, ExternalFactor, CompanyDataSnapshot, IndexMembershipSnapshot } = require('../models');
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
          SELECT id, code, exchange FROM stocks WHERE listing_status = 'listed'
        ), latest AS (
          SELECT COALESCE($1::date, MAX((observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)) AS session_date
          FROM stock_prices WHERE provider = 'vnstock' AND interval = '1d' AND observed_at IS NOT NULL
        ), coverage AS (
          SELECT l.code, l.id, l.exchange, EXISTS (
            SELECT 1 FROM stock_prices p WHERE p.stock_id = l.id AND p.provider = 'vnstock' AND p.interval = '1d'
              AND (p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = latest.session_date
          ) AS covered
          FROM listed l CROSS JOIN latest
        ), summary AS (
        SELECT latest.session_date::text AS session_date,
          (SELECT COUNT(*)::int FROM listed) AS listed,
          COUNT(*) FILTER (WHERE coverage.covered)::int AS covered,
          COUNT(*) FILTER (WHERE NOT coverage.covered)::int AS missing,
          ARRAY_REMOVE(ARRAY_AGG(coverage.code ORDER BY coverage.code) FILTER (WHERE NOT coverage.covered), NULL) AS missing_symbols
        FROM latest CROSS JOIN coverage GROUP BY latest.session_date
        ), exchange_summary AS (
          SELECT COALESCE(exchange, 'unknown') AS exchange, COUNT(*)::int AS listed,
            COUNT(*) FILTER (WHERE covered)::int AS covered,
            COUNT(*) FILTER (WHERE NOT covered)::int AS missing
          FROM coverage GROUP BY COALESCE(exchange, 'unknown')
        )
        SELECT summary.*, COALESCE((SELECT JSONB_AGG(JSONB_BUILD_OBJECT('exchange', exchange, 'listed', listed, 'covered', covered, 'missing', missing) ORDER BY exchange) FROM exchange_summary), '[]'::jsonb) AS exchange_coverage
        FROM summary
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
        lastEodRun = readLatestEodEvidence(evidenceDir, summary.session_date);
      } catch (_) { /* evidence is optional operational metadata */ }
      const retryPasses = Math.max(0, Number(process.env.VNSTOCK_EOD_GAP_RETRIES || 2));
      const coveragePct = Number(summary.listed) ? Number((Number(summary.covered) / Number(summary.listed) * 100).toFixed(1)) : null;
      const exchangeCoverage = Array.isArray(summary.exchange_coverage) ? summary.exchange_coverage.map(row => {
        const listed = Number(row?.listed || 0);
        const covered = Number(row?.covered || 0);
        return { exchange: String(row?.exchange || 'unknown'), listed, covered, missing: Number(row?.missing || 0), coverage_pct: listed ? Number((covered / listed * 100).toFixed(1)) : null };
      }) : [];
      const tradePriority = lastEodRun?.evidence?.trade_priority;
      const normalizedTradePriority = tradePriority && typeof tradePriority === 'object' ? {
        enabled: tradePriority.enabled !== false,
        probed: finiteEvidenceNumber(tradePriority.probed),
        batches: finiteEvidenceNumber(tradePriority.batches),
        failed_batches: finiteEvidenceNumber(tradePriority.failed_batches) || 0,
        matched: finiteEvidenceNumber(tradePriority.matched),
        had_error: Boolean(tradePriority.error) || Number(tradePriority.failed_batches || 0) > 0
      } : null;
      res.set('Cache-Control', 'no-store');
      return res.json({ success: true, data: {
        session_date: summary.session_date,
        listed: Number(summary.listed || 0),
        covered: Number(summary.covered || 0),
        missing: Number(summary.missing || 0),
        coverage_pct: coveragePct,
        missing_symbols: summary.missing_symbols || [],
        exchange_coverage: exchangeCoverage,
        missing_breakdown: {
          never_seen: Number(breakdown.never_seen || 0),
          previous_session: Number(breakdown.previous_session || 0),
          stale_history: Number(breakdown.stale_history || 0)
        },
        ready: Number(summary.missing || 0) === 0,
        provider: health,
        eod_retry: {
          mode: 'scheduled',
          schedule: process.env.VNSTOCK_EOD_CRON || '5 15 * * 1-5',
          gap_schedule: process.env.VNSTOCK_EOD_GAP_RETRY_CRON || '15,30,45 15 * * 1-5',
          late_gap_schedule: process.env.VNSTOCK_EOD_LATE_GAP_RETRY_CRON || '*/15 16-19 * * 1-5',
          configured_passes: retryPasses,
          last_run_at: lastEodRun?.evidence?.checked_at || null,
          last_run_mode: lastEodRun?.mode || null,
          last_run_file: lastEodRun?.file || null,
          last_run_passes: Array.isArray(lastEodRun?.evidence?.retries) ? lastEodRun.evidence.retries.length : 0,
          last_run_universe: lastEodRun?.evidence?.after?.symbols ?? null,
          last_run_covered: lastEodRun?.evidence?.after?.covered ?? null,
          last_run_remaining: lastEodRun?.evidence?.after?.missing_symbols?.length ?? null,
          last_run_requested: finiteEvidenceNumber(lastEodRun?.evidence?.requested),
          last_run_selected: finiteEvidenceNumber(lastEodRun?.evidence?.selected),
          last_run_selected_traded: finiteEvidenceNumber(lastEodRun?.evidence?.selected_traded),
          last_run_trade_priority: normalizedTradePriority,
          last_run_complete: lastEodRun?.evidence?.complete ?? null,
          last_run_failed: Boolean(lastEodRun?.evidence?.error),
          runtime: getEodRetryStatus()
        }
      } });
    } catch (error) {
      console.error('[Stock Controller] Error checking market data quality:', error);
      return httpError(res, 500, 'market_quality_failed', 'Unable to inspect market data quality');
    }
  });

  // This is deliberately a database-only research endpoint.  It never asks a
  // market-data provider for a new quote while a dashboard is being rendered.
  router.get('/liquid30-readiness', async (_req, res) => {
    try {
      const [rows] = await Stock.sequelize.query(`
        WITH listed AS (
          SELECT id, code, listing_status FROM stocks WHERE listing_status = 'listed'
        ), latest AS (
          SELECT MAX((observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) AS session_date
          FROM stock_prices WHERE provider = 'vnstock' AND interval = '1d' AND observed_at IS NOT NULL
        ), session_prices AS (
          SELECT DISTINCT ON (p.stock_id)
            p.stock_id, (p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date::text AS observed_at,
            p.close, p.price, p.traded_value, p.price_unit
          FROM stock_prices p CROSS JOIN latest
          WHERE p.provider = 'vnstock' AND p.interval = '1d'
            AND (p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = latest.session_date
          ORDER BY p.stock_id, p.observed_at DESC NULLS LAST, p.id DESC
        )
        SELECT l.id, l.code, l.listing_status, sp.stock_id, sp.observed_at, sp.close, sp.price, sp.traded_value, sp.price_unit
        FROM listed l LEFT JOIN session_prices sp ON sp.stock_id = l.id
      `);
      const stocks = rows.map(row => ({ id: row.id, code: row.code, listing_status: row.listing_status }));
      const prices = rows.filter(row => row.stock_id).map(row => ({
        stock_id: row.stock_id, observed_at: row.observed_at, close: row.close,
        price: row.price, traded_value: row.traded_value, price_unit: row.price_unit
      }));
      // The temporary 65% exception is research-only and is encoded in the
      // response. Forecast issuance retains its separate validation gate.
      const data = buildLiquid30Readiness({ stocks, prices, minimumCoverage: .65, allowObservedSubset: true });
      res.set('Cache-Control', 'no-store');
      return res.json({ success: true, data });
    } catch (error) {
      console.error('[Stock Controller] Error building Liquid30 readiness:', error);
      return httpError(res, 500, 'market_liquid30_readiness_failed', 'Unable to inspect Liquid30 readiness');
    }
  });

  // Membership is deliberately read only from a sealed, source-backed
  // snapshot. This route never derives VN30 members from price or turnover.
  router.get('/vn30-readiness', async (_req, res) => {
    try {
      const snapshot = await IndexMembershipSnapshot.findOne({
        where: { index_code: 'VN30', status: 'sealed' },
        include: [{ association: 'constituents' }],
        order: [['effective_from', 'DESC'], ['ingested_at', 'DESC']]
      });
      if (!snapshot) {
        res.set('Cache-Control', 'no-store');
        return res.json({ success: true, data: buildOfficialIndexReadiness() });
      }
      const plainSnapshot = typeof snapshot.get === 'function' ? snapshot.get({ plain: true }) : snapshot;
      const symbols = (plainSnapshot.constituents || []).map(item => String(item.symbol || '').trim().toUpperCase()).filter(Boolean);
      const [rows] = symbols.length ? await Stock.sequelize.query(`
        SELECT DISTINCT ON (s.code) s.code AS symbol,
          (p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date::text AS observed_at, p.close, p.price
        FROM stocks s JOIN stock_prices p ON p.stock_id = s.id
        WHERE s.code = ANY($1::text[]) AND p.provider = 'vnstock' AND p.interval = '1d'
        ORDER BY s.code, p.observed_at DESC NULLS LAST, p.id DESC
      `, { bind: [symbols] }) : [[]];
      res.set('Cache-Control', 'no-store');
      return res.json({ success: true, data: buildOfficialIndexReadiness({ snapshot: plainSnapshot, prices: rows }) });
    } catch (error) {
      console.error('[Stock Controller] Error building OfficialVN30 readiness:', error);
      return httpError(res, 500, 'market_vn30_readiness_failed', 'Unable to inspect OfficialVN30 readiness');
    }
  });

  router.get('/breadth/history', async (req, res) => {
    try {
      const parsedSessions = Number(req.query.sessions || 20);
      const sessions = Number.isFinite(parsedSessions) ? Math.min(60, Math.max(1, parsedSessions)) : 20;
      const requestedExchange = String(req.query.exchange || '').trim().toUpperCase();
      const exchange = ['HSX', 'HNX', 'UPCOM'].includes(requestedExchange) ? requestedExchange : null;
      const requestedSector = String(req.query.sector || '').trim();
      const sector = Object.prototype.hasOwnProperty.call(SECTOR_CODES, requestedSector) || requestedSector === 'other' ? requestedSector : null;
      const sectorCodes = sector && sector !== 'other' ? SECTOR_CODES[sector] : [];
      const sectorPatterns = sector && sector !== 'other' ? SECTOR_INDUSTRY_LIKE[sector] : [];
      const cacheKey = `v4:market-breadth-history:${exchange || 'ALL'}:${sector || 'ALL'}:${sessions}`;
      const cached = await cacheService.get(cacheKey);
      if (cached?.data) return res.json({ success: true, data: cached.data, source: 'cache' });
      const [rows] = await Stock.sequelize.query(`
        WITH scoped_stocks AS (
          SELECT s.id, s.code, s.exchange
          FROM stocks s
          WHERE s.listing_status = 'listed' AND ($1::text IS NULL OR s.exchange = $1)
            AND (
              $2::text IS NULL
              OR ($2 = 'other' AND NOT (s.code = ANY($5::text[]) OR COALESCE(s.industry, '') ILIKE ANY($6::text[])))
              OR ($2 <> 'other' AND (s.code = ANY($3::text[]) OR (NOT (s.code = ANY($5::text[])) AND COALESCE(s.industry, '') ILIKE ANY($4::text[]))))
            )
        ), selected_sessions AS (
          SELECT DISTINCT (p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS session_date
          FROM stock_prices p JOIN scoped_stocks s ON s.id = p.stock_id
          WHERE p.provider = 'vnstock' AND p.interval = '1d' AND p.observed_at IS NOT NULL
          ORDER BY session_date DESC LIMIT $7
        ), ranked AS (
          SELECT p.stock_id, s.exchange,
            (p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS session_date,
            COALESCE(p.close, p.price)::numeric AS close,
            p.volume::numeric AS volume, p.traded_value::numeric AS traded_value,
            ROW_NUMBER() OVER (PARTITION BY p.stock_id, (p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date ORDER BY p.observed_at DESC, p.id DESC) AS row_number
          FROM stock_prices p JOIN scoped_stocks s ON s.id = p.stock_id
          WHERE p.provider = 'vnstock' AND p.interval = '1d' AND p.observed_at IS NOT NULL
            AND (p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date IN (SELECT session_date FROM selected_sessions)
        ), daily AS (
          SELECT stock_id, session_date, close, volume, traded_value FROM ranked WHERE row_number = 1 AND close IS NOT NULL
        ), compared AS (
          SELECT daily.*, previous.close AS previous_close
          FROM daily
          LEFT JOIN LATERAL (
            SELECT COALESCE(p.close, p.price)::numeric AS close
            FROM stock_prices p
            WHERE p.stock_id = daily.stock_id AND p.provider = 'vnstock' AND p.interval = '1d'
              AND p.observed_at IS NOT NULL
              AND (p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date < daily.session_date
            ORDER BY p.observed_at DESC, p.id DESC LIMIT 1
          ) previous ON TRUE
        ), aggregated AS (
          SELECT session_date::text AS session_date,
            COUNT(*)::int AS covered,
            COUNT(*) FILTER (WHERE previous_close IS NOT NULL)::int AS classified,
            COUNT(*) FILTER (WHERE previous_close IS NOT NULL AND close > previous_close)::int AS advances,
            COUNT(*) FILTER (WHERE previous_close IS NOT NULL AND close < previous_close)::int AS declines,
            COUNT(*) FILTER (WHERE previous_close IS NOT NULL AND close = previous_close)::int AS unchanged,
            COALESCE(SUM(volume) FILTER (WHERE previous_close IS NOT NULL AND close > previous_close), 0) AS volume_advances,
            COALESCE(SUM(volume) FILTER (WHERE previous_close IS NOT NULL AND close < previous_close), 0) AS volume_declines,
            COALESCE(SUM(volume) FILTER (WHERE previous_close IS NOT NULL AND close = previous_close), 0) AS volume_unchanged,
            COUNT(volume) FILTER (WHERE previous_close IS NOT NULL)::int AS volume_observations,
            SUM(traded_value) AS traded_value,
            COUNT(traded_value)::int AS traded_value_observations,
            (SELECT COUNT(*)::int FROM scoped_stocks) AS universe
          FROM compared GROUP BY session_date
        )
        SELECT * FROM (SELECT * FROM aggregated ORDER BY session_date DESC LIMIT $8) latest ORDER BY session_date ASC
      `, { bind: [exchange, sector, sectorCodes, sectorPatterns, CLASSIFIED_CODES, ALL_SECTOR_INDUSTRY_PATTERNS, sessions, sessions] });
      const data = buildMarketBreadthHistory(rows, { sessions, exchange, sector, sectorLabel: sector ? SECTOR_LABELS[sector] || 'Khác / chưa phân loại' : null });
      await cacheService.set(cacheKey, { data }, 5, 'market_breadth');
      return res.json({ success: true, data, source: 'database' });
    } catch (error) {
      console.error('[Stock Controller] Error fetching market breadth history:', error);
      return httpError(res, 500, 'market_breadth_history_failed', 'Unable to fetch market breadth history');
    }
  });

  router.get('/basket', async (req, res) => {
    try {
      const scope = ['market', 'sector', 'portfolio'].includes(String(req.query.scope || 'market')) ? String(req.query.scope || 'market') : 'market';
      const requestedExchange = String(req.query.exchange || '').trim().toUpperCase();
      const exchange = ['HSX', 'HNX', 'UPCOM'].includes(requestedExchange) ? requestedExchange : null;
      const requestedSector = String(req.query.sector || '').trim();
      const sector = Object.prototype.hasOwnProperty.call(SECTOR_CODES, requestedSector) || requestedSector === 'other' ? requestedSector : null;
      const limit = Number.isFinite(Number(req.query.limit)) ? Math.min(12, Math.max(3, Number(req.query.limit))) : 6;
      const requestedSymbols = String(req.query.symbols || '').split(',').map(value => value.trim().toUpperCase()).filter(Boolean);

      let where = { listing_status: 'listed' };
      if (exchange) where.exchange = exchange;
      if (scope === 'sector' && sector) {
        Object.assign(where, sectorCondition(sector));
      }
      if (scope === 'portfolio' && requestedSymbols.length) {
        where.code = { [Op.in]: requestedSymbols };
      }
      if (scope === 'portfolio' && !requestedSymbols.length) {
        return res.json({ success: true, data: { scope, generated_at: new Date().toISOString(), items: [], summary: { leaders: 0, laggards: 0, neutral: 0, total: 0, average_return: 0 }, meta: { source: 'server', requested_limit: limit, total_candidates: 0 } } });
      }

      const stocks = await Stock.findAll({
        attributes: ['id', 'code', 'name', 'exchange', 'industry'],
        where,
        order: [['code', 'ASC']],
        limit: 250
      });

      const basketItems = [];
      for (const stock of stocks) {
        const prices = await StockPrice.findAll({
          where: { stock_id: stock.id, provider: 'vnstock', interval: '1d' },
          attributes: ['close', 'price', 'volume', 'observed_at', 'provider'],
          order: [['observed_at', 'DESC'], ['id', 'DESC']],
          limit: 2
        });
        const latest = prices[0] || null;
        const previous = prices[1] || null;
        const latestPrice = Number(latest?.close ?? latest?.price ?? 0);
        const previousPrice = Number(previous?.close ?? previous?.price ?? latestPrice);
        const changePct = previousPrice > 0 && latestPrice > 0 ? Number((((latestPrice - previousPrice) / previousPrice) * 100).toFixed(2)) : 0;
        const signal = changePct > 0 ? 'leader' : changePct < 0 ? 'laggard' : 'neutral';
        basketItems.push({
          symbol: stock.code,
          name: stock.name || stock.code,
          exchange: stock.exchange,
          sector: sectorForStock(stock),
          price: latestPrice,
          change_pct: changePct,
          volume: Number(latest?.volume ?? 0),
          signal,
          trend: signal === 'leader' ? 'up' : signal === 'laggard' ? 'down' : 'flat',
          source: latest?.provider || 'vnstock',
          observed_at: latest?.observed_at || null
        });
      }

      const sorted = basketItems.sort((left, right) => right.change_pct - left.change_pct || right.volume - left.volume || left.symbol.localeCompare(right.symbol));
      const items = sorted.slice(0, limit).map((item, index) => ({ ...item, rank: index + 1, display_change: `${item.change_pct > 0 ? '+' : ''}${item.change_pct.toFixed(2)}%` }));
      const leaders = items.filter(item => item.signal === 'leader').length;
      const laggards = items.filter(item => item.signal === 'laggard').length;
      const neutral = items.filter(item => item.signal === 'neutral').length;
      const averageReturn = items.length ? Number((items.reduce((sum, item) => sum + item.change_pct, 0) / items.length).toFixed(2)) : 0;
      return res.json({ success: true, data: { scope, generated_at: new Date().toISOString(), summary: { leaders, laggards, neutral, total: items.length, average_return: averageReturn }, items, meta: { source: 'server', requested_limit: limit, total_candidates: basketItems.length } } });
    } catch (error) {
      console.error('[Stock Controller] Error building market basket:', error);
      return httpError(res, 500, 'market_basket_failed', 'Unable to generate market basket');
    }
  });

  const normalizeStock = (stock, latestSessionDate = null) => {
    const priceRecord = stock.prices?.[0];
    const latestPrice = priceRecord?.close != null ? Number(priceRecord.close) : priceRecord?.price != null ? Number(priceRecord.price) : null;
    const previousRecord = stock.prices?.[1];
    const previousPrice = priceRecord?.reference_price != null
      ? Number(priceRecord.reference_price)
      : previousRecord?.close != null
        ? Number(previousRecord.close)
        : previousRecord?.price != null ? Number(previousRecord.price) : null;
    const change = Number.isFinite(latestPrice) && Number.isFinite(previousPrice) && previousPrice > 0
      ? Number((((latestPrice - previousPrice) / previousPrice) * 100).toFixed(4))
      : null;
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
      change,
      volume: priceRecord?.volume != null ? Number(priceRecord.volume) : null,
      data_source: priceRecord?.provider || null,
      data_fetched_at: priceRecord?.fetched_at || null,
      data_session_date: dataSessionDate,
      data_is_stale: Boolean(latestSessionDate && dataSessionDate && dataSessionDate !== latestSessionDate),
      currency: priceRecord?.currency || null,
      price_unit: priceRecord?.price_unit || null
    };
  };

  router.get('/export.csv', async (req, res) => {
    try {
      const exportLimit = 2000;
      const query = String(req.query.q || '').trim();
      const coverage = ['ready', 'incomplete'].includes(String(req.query.coverage)) ? String(req.query.coverage) : '';
      const requestedSector = String(req.query.sector || '').trim();
      const sector = Object.prototype.hasOwnProperty.call(SECTOR_CODES, requestedSector) || requestedSector === 'other' ? requestedSector : '';
      const requestedExchange = String(req.query.exchange || '').trim().toUpperCase();
      const exchange = ['HSX', 'HNX', 'UPCOM'].includes(requestedExchange) ? requestedExchange : '';
      const requestedListingStatus = String(req.query.listing_status || '').trim().toLowerCase();
      const listingStatus = ['listed', 'delisted', 'unknown'].includes(requestedListingStatus) ? requestedListingStatus : '';
      const requestedSort = String(req.query.sort || 'name');
      const sort = ['code', 'name', 'price', 'volume'].includes(requestedSort) ? requestedSort : 'name';
      const direction = String(req.query.direction || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
      const pinned = [...new Set(String(req.query.pinned || '').toUpperCase().split(',').map(code => code.trim()).filter(code => /^[A-Z0-9]{1,10}$/.test(code)))].sort().slice(0, 200);
      const filters = [];
      if (query) filters.push({ [Op.or]: [{ code: { [Op.iLike]: `%${query}%` } }, { name: { [Op.iLike]: `%${query}%` } }] });
      if (sector) filters.push(sectorCondition(sector));
      if (exchange) filters.push({ exchange });
      if (listingStatus) filters.push({ listing_status: listingStatus });
      if (coverage) filters.push(Stock.sequelize.literal(`(SELECT COUNT(*) FROM stock_prices AS coverage_prices WHERE coverage_prices.stock_id = "Stock"."id") ${coverage === 'ready' ? '>=' : '<'} 50`));
      const where = filters.length === 1 ? filters[0] : filters.length ? { [Op.and]: filters } : undefined;
      const latestValue = field => Stock.sequelize.literal(`(SELECT COALESCE(sp.${field === 'price' ? 'close' : field}, sp.${field === 'price' ? 'price' : field}) FROM stock_prices AS sp WHERE sp.stock_id = "Stock"."id" AND sp.observed_at IS NOT NULL ORDER BY sp.observed_at DESC NULLS LAST, sp.id DESC LIMIT 1)`);
      const orderColumn = sort === 'price' || sort === 'volume' ? latestValue(sort) : sort;
      const order = sort === 'price' || sort === 'volume' ? [[Stock.sequelize.literal(`CASE WHEN ${latestValue(sort).val} IS NULL THEN 1 ELSE 0 END`), 'ASC'], [orderColumn, direction]] : [[orderColumn, direction]];
      if (pinned.length) order.unshift([Stock.sequelize.literal(`CASE WHEN "Stock"."code" IN (${pinned.map(code => `'${code}'`).join(',')}) THEN 0 ELSE 1 END`), 'ASC']);
      if (sort !== 'code') order.push(['code', 'ASC']);
      const rows = await Stock.findAll({
        where,
        include: [{ association: 'prices', separate: true, where: { observed_at: { [Op.not]: null } }, limit: 1, order: [['observed_at', 'DESC NULLS LAST'], ['updated_at', 'DESC NULLS LAST'], ['id', 'DESC']] }],
        order,
        limit: exportLimit + 1
      });
      const normalized = rows.slice(0, exportLimit).map(stock => normalizeStock(stock));
      const requestedColumns = new Set(String(req.query.columns || 'name,volume').split(',').map(value => value.trim()));
      const csv = serializeStockCsv(normalized, { name: requestedColumns.has('name'), volume: requestedColumns.has('volume') });
      res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="stockpilot-bang-gia-${new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'no-store',
        'X-Export-Count': String(normalized.length),
        'X-Export-Limit': String(exportLimit),
        'X-Export-Truncated': rows.length > exportLimit ? 'true' : 'false'
      });
      return res.send(csv);
    } catch (error) {
      console.error('[Stock Controller] Error exporting stocks:', error);
      return httpError(res, 500, 'market_export_failed', 'Error exporting stocks');
    }
  });

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
      const requestedListingStatus = String(req.query.listing_status || '').trim().toLowerCase();
      const listingStatus = ['listed', 'delisted', 'unknown'].includes(requestedListingStatus) ? requestedListingStatus : '';
      const requestedSort = String(req.query.sort || 'name');
      const sort = ['code', 'name', 'price', 'volume'].includes(requestedSort) ? requestedSort : 'name';
      const direction = String(req.query.direction || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
      // Pin order is a display preference, not an authorization or ownership claim.
      const pinned = [...new Set(String(req.query.pinned || '').toUpperCase().split(',').map(code => code.trim()).filter(code => /^[A-Z0-9]{1,10}$/.test(code)))].sort().slice(0, 200);
      const filters = [];
      if (query) filters.push({ [Op.or]: [{ code: { [Op.iLike]: `%${query}%` } }, { name: { [Op.iLike]: `%${query}%` } }] });
      if (sector) filters.push(sectorCondition(sector));
      if (exchange) filters.push({ exchange });
      if (listingStatus) filters.push({ listing_status: listingStatus });
      if (coverage) filters.push(Stock.sequelize.literal(`(SELECT COUNT(*) FROM stock_prices AS coverage_prices WHERE coverage_prices.stock_id = "Stock"."id") ${coverage === 'ready' ? '>=' : '<'} 50`));
      const where = filters.length === 1 ? filters[0] : filters.length ? { [Op.and]: filters } : undefined;
      const cacheKey = `v11:stocks:${page}:${pageSize}:${sort}:${direction}:${coverage}:${sector}:${exchange}:${listingStatus}:${query.toLowerCase()}:${pinned.join(',')}`;
      let cached = await cacheService.get(cacheKey);
      if (cached) return res.json({ success: true, data: cached.data, pagination: cached.pagination, source: 'cache' });
      const latestValue = field => Stock.sequelize.literal(`(SELECT COALESCE(sp.${field === 'price' ? 'close' : field}, sp.${field === 'price' ? 'price' : field}) FROM stock_prices AS sp WHERE sp.stock_id = "Stock"."id" AND sp.observed_at IS NOT NULL ORDER BY sp.observed_at DESC NULLS LAST, sp.id DESC LIMIT 1)`);
      const orderColumn = sort === 'price' || sort === 'volume' ? latestValue(sort) : sort;
      const order = sort === 'price' || sort === 'volume' ? [[Stock.sequelize.literal(`CASE WHEN ${latestValue(sort).val} IS NULL THEN 1 ELSE 0 END`), 'ASC'], [orderColumn, direction]] : [[orderColumn, direction]];
      if (pinned.length) order.unshift([Stock.sequelize.literal(`CASE WHEN "Stock"."code" IN (${pinned.map(code => `'${code}'`).join(',')}) THEN 0 ELSE 1 END`), 'ASC']);
      if (sort !== 'code') order.push(['code', 'ASC']);
      const queryOptions = { where, include: [{ association: 'prices', separate: true, where: { observed_at: { [Op.not]: null } }, limit: 2, order: [['observed_at', 'DESC NULLS LAST'], ['updated_at', 'DESC NULLS LAST'], ['id', 'DESC']] }], order, limit: pageSize, offset: (page - 1) * pageSize, distinct: true };
      let latestSessionDate = null;
      try {
        const [sessionRows] = await Stock.sequelize.query("SELECT MAX((observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::text AS session_date FROM stock_prices WHERE provider='vnstock' AND interval='1d' AND observed_at IS NOT NULL");
        latestSessionDate = sessionRows?.[0]?.session_date || null;
      } catch (_) { /* freshness metadata is additive; do not fail the stock list */ }
      const result = typeof Stock.findAndCountAll === 'function'
        ? await Stock.findAndCountAll(queryOptions)
        : { rows: await Stock.findAll(queryOptions), count: 0 };

      const payload = result.rows.map(stock => normalizeStock(stock, latestSessionDate));
      const pagination = { page, pageSize, total: result.count, totalPages: Math.max(1, Math.ceil(result.count / pageSize)), query, coverage, sector, exchange, listing_status: listingStatus, sort, direction: direction.toLowerCase() };
      await cacheService.set(cacheKey, { data: payload, pagination }, 5, 'stock');

      res.json({ success: true, data: payload, pagination, source: 'database' });
    } catch (error) {
      console.error('[Stock Controller] Error fetching stocks:', error);
      httpError(res, 500, 'market_list_failed', 'Error fetching stocks');
    }
  });

  router.get('/:id/analysis', async (req, res) => {
    try {
      const stock = await Stock.findByPk(req.params.id, { include: [{ association: 'prices', separate: true, where: { observed_at: { [Op.not]: null } }, order: [['observed_at', 'ASC NULLS LAST'], ['updated_at', 'ASC NULLS LAST'], ['id', 'ASC']], limit: 250 }] });
      if (!stock) return httpError(res, 404, 'market_stock_not_found', 'Stock not found');
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
    } catch (error) { console.error('[Stock Controller] Error analyzing stock:', error); return httpError(res, 500, 'market_analysis_failed', 'Error analyzing stock'); }
  });

  router.get('/:id/quote', async (req, res) => {
    try {
      const stock = await Stock.findByPk(req.params.id);
      if (!stock) return httpError(res, 404, 'market_stock_not_found', 'Stock not found');
      if (String(process.env.REALTIME_QUOTES_ENABLED || 'true').toLowerCase() === 'false') {
        return res.status(503).json({ success: false, code: 'quote_realtime_disabled', message: 'Realtime quotes are disabled' });
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
        return res.status(503).json({ success: false, code: 'quote_realtime_disabled', message: 'Realtime quotes are disabled' });
      }
      const symbols = [...new Set(String(req.query.symbols || '').split(',').map(item => item.trim().toUpperCase()).filter(symbol => /^[A-Z0-9]{1,10}$/.test(symbol)))].slice(0, 200);
      if (!symbols.length) return httpError(res, 400, 'market_quote_symbols_required', 'At least one symbol is required');
      const quotes = await loadQuotes(symbols);
      const missingSymbols = symbols.filter(symbol => !Object.prototype.hasOwnProperty.call(quotes, symbol));
      res.set('Cache-Control', 'no-store');
      return res.json({
        success: true,
        data: quotes,
        requested: symbols.length,
        returned: Object.keys(quotes).length,
        coverage_pct: Number((Object.keys(quotes).length / symbols.length * 100).toFixed(1)),
        complete: missingSymbols.length === 0,
        missing_symbols: missingSymbols
      });
    } catch (error) {
      console.error('[Stock Controller] Error fetching intraday quotes:', error);
      return res.status(503).json({ success: false, message: 'Realtime quote provider unavailable', code: 'quote_provider_unavailable' });
    }
  });

  router.get('/quotes/status', async (req, res) => {
    try {
      if (String(process.env.REALTIME_QUOTES_ENABLED || 'true').toLowerCase() === 'false') {
        return res.status(503).json({ success: false, code: 'quote_realtime_disabled', message: 'Realtime quotes are disabled' });
      }
      res.set('Cache-Control', 'no-store');
      return res.json({ success: true, data: liveQuoteService.health() });
    } catch (error) {
      console.error('[Stock Controller] Error fetching intraday provider status:', error);
      return httpError(res, 500, 'market_quote_health_failed', 'Unable to inspect realtime quote provider');
    }
  });

  router.get('/:id/external-factors', async (req, res) => {
    try {
      const stock = await Stock.findByPk(req.params.id);
      if (!stock) return httpError(res, 404, 'market_stock_not_found', 'Stock not found');
      const factors = await ExternalFactor.findAll({ where: { [Op.or]: [{ symbol: stock.code }, { symbol: null }] }, order: [['published_at', 'DESC']], limit: 50 });
      return res.json({ success: true, data: factors.map(item => item.toJSON()), verified: factors.filter(item => item.status === 'verified').length });
    } catch (error) { console.error('[Stock Controller] Error fetching external factors:', error); return httpError(res, 500, 'market_external_factors_failed', 'Error fetching external factors'); }
  });

  router.get('/:id/company-profile', async (req, res) => {
    try {
      const stock = await Stock.findByPk(req.params.id);
      if (!stock) return httpError(res, 404, 'market_stock_not_found', 'Stock not found');
      const stored = CompanyDataSnapshot ? await readLatestCompanySnapshot({ CompanyDataSnapshot, stockId:stock.id, dataset:'profile' }) : null;
      if (stored) return res.json({ success:true, data:stored, source:'database_snapshot' });
      const cacheKey = `v1:company-profile:${stock.id}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return res.json({ success:true, data:cached, source:'cache' });
      let providerPayload = null;
      try { providerPayload = await fetchCompanyProfile(stock.code); } catch (_) { /* local profile remains usable */ }
      const data = normalizeCompanyProfile({ stock: stock.toJSON ? stock.toJSON() : stock, providerPayload });
      await cacheService.set(cacheKey, data, providerPayload ? 360 : 15, 'company_profile');
      return res.json({ success:true, data, source:providerPayload ? 'provider' : 'local_reference' });
    } catch (error) {
      console.error('[Stock Controller] Company profile failed:', error.message);
      return httpError(res, 500, 'market_company_profile_failed', 'Unable to load company profile');
    }
  });

  router.get('/:id/company-people', async (req, res) => {
    try {
      const stock = await Stock.findByPk(req.params.id);
      if (!stock) return httpError(res, 404, 'market_stock_not_found', 'Stock not found');
      const stored = CompanyDataSnapshot ? await readLatestCompanySnapshot({ CompanyDataSnapshot, stockId:stock.id, dataset:'people' }) : null;
      if (stored) return res.json({ success:true, data:stored, source:'database_snapshot' });
      const cacheKey = `v1:company-people:${stock.id}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return res.json({ success:true, data:cached, source:'cache' });
      let providerPayload = null;
      try { providerPayload = await fetchCompanyPeople(stock.code); } catch (_) { /* explicit unavailable contract below */ }
      const data = normalizeCompanyPeople({ symbol:stock.code, providerPayload });
      await cacheService.set(cacheKey, data, data.status === 'unavailable' ? 15 : 360, 'company_people');
      return res.json({ success:true, data, source:providerPayload ? 'provider' : 'provider_unavailable' });
    } catch (error) {
      console.error('[Stock Controller] Company people failed:', error.message);
      return httpError(res, 500, 'market_company_people_failed', 'Unable to load company shareholders and officers');
    }
  });

  router.get('/:id/company-capital', async (req, res) => {
    try {
      const stock = await Stock.findByPk(req.params.id);
      if (!stock) return httpError(res, 404, 'market_stock_not_found', 'Stock not found');
      const stored = CompanyDataSnapshot ? await readLatestCompanySnapshot({ CompanyDataSnapshot, stockId:stock.id, dataset:'capital' }) : null;
      if (stored) return res.json({ success:true, data:stored, source:'database_snapshot' });
      const cacheKey = `v1:company-capital:${stock.id}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return res.json({ success:true, data:cached, source:'cache' });
      let providerPayload = null;
      try { providerPayload = await fetchCompanyCapital(stock.code); } catch (_) { /* explicit unavailable contract below */ }
      const data = normalizeCompanyCapital({ symbol:stock.code, providerPayload });
      await cacheService.set(cacheKey, data, data.status === 'unavailable' ? 15 : 360, 'company_capital');
      return res.json({ success:true, data, source:providerPayload ? 'provider' : 'provider_unavailable' });
    } catch (error) {
      console.error('[Stock Controller] Company capital failed:', error.message);
      return httpError(res, 500, 'market_company_capital_failed', 'Unable to load company capital and events');
    }
  });
  router.get('/:id/company-financials', async (req,res)=>{try{const stock=await Stock.findByPk(req.params.id);if(!stock)return httpError(res,404,'market_stock_not_found','Stock not found');const stored=CompanyDataSnapshot?await readLatestCompanySnapshot({CompanyDataSnapshot,stockId:stock.id,dataset:'financials'}):null;if(stored)return res.json({success:true,data:stored,source:'database_snapshot'});const cacheKey=`v1:company-financials:${stock.id}`;const cached=await cacheService.get(cacheKey);if(cached)return res.json({success:true,data:cached,source:'cache'});let providerPayload=null;try{providerPayload=await fetchCompanyFinancials(stock.code)}catch(_) { /* Provider unavailable; return normalized unavailable data. */ }const data=normalizeCompanyFinancials({symbol:stock.code,providerPayload});await cacheService.set(cacheKey,data,data.status==='unavailable'?15:360,'company_financials');return res.json({success:true,data,source:providerPayload?'provider':'provider_unavailable'})}catch(error){console.error('[Stock Controller] Company financials failed:',error.message);return httpError(res,500,'market_company_financials_failed','Unable to load company financials')}});
  router.get('/:id/company-news',async(req,res)=>{try{const stock=await Stock.findByPk(req.params.id);if(!stock)return httpError(res,404,'market_stock_not_found','Stock not found');const stored=CompanyDataSnapshot?await readLatestCompanySnapshot({CompanyDataSnapshot,stockId:stock.id,dataset:'news'}):null;if(stored)return res.json({success:true,data:stored,source:'database_snapshot'});const cacheKey=`v1:company-news:${stock.id}`;const cached=await cacheService.get(cacheKey);if(cached)return res.json({success:true,data:cached,source:'cache'});let providerPayload=null;try{providerPayload=await fetchCompanyNews(stock.code)}catch(_) { /* Provider unavailable; return normalized unavailable data. */ }const data=normalizeCompanyNews({symbol:stock.code,providerPayload});await cacheService.set(cacheKey,data,data.status==='unavailable'?15:60,'company_news');return res.json({success:true,data,source:providerPayload?'provider':'provider_unavailable'})}catch(error){console.error('[Stock Controller] Company news failed:',error.message);return httpError(res,500,'market_company_news_failed','Unable to load company news')}});

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
        return httpError(res, 404, 'market_stock_not_found', 'Stock not found');
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
      httpError(res, 500, 'market_detail_failed', 'Error fetching stock');
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
        return httpError(res, 404, 'market_stock_not_found', 'Stock not found');
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
      httpError(res, 500, 'market_price_history_failed', 'Error fetching price');
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
      await cacheService.delete(`v7:stock:${id}`);
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
      httpError(res, 500, 'market_cache_stats_failed', 'Error fetching cache stats');
    }
  });

  router.post('/cache/clear', requireAdmin, async (req, res) => {
    try {
      await cacheService.clearAll();
      res.json({ success: true, message: 'Cache cleared' });
    } catch (error) {
      console.error('[Stock Controller] Error clearing cache:', error);
      httpError(res, 500, 'market_cache_clear_failed', 'Error clearing cache');
    }
  });

  return router;
};


