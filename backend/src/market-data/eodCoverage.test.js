'use strict';

const { eodCoverage } = require('./eodCoverage');
const { ingestVnstockEod } = require('./vnstockEodIngestion');

describe('listed EOD universe', () => {
  test('coverage excludes delisted and unknown listing rows at the query boundary', async () => {
    const sequelize = { query: jest.fn().mockResolvedValue([[
      { code: 'FPT', covered: true },
      { code: 'SSI', covered: false }
    ]]) };
    await expect(eodCoverage(sequelize, '2026-10-02')).resolves.toEqual({
      session_date: '2026-10-02', symbols: 2, covered: 1, missing_symbols: ['SSI']
    });
    expect(sequelize.query.mock.calls[0][0]).toContain("s.listing_status = 'listed'");
    expect(sequelize.query.mock.calls[0][1].bind).toEqual(['2026-10-02', null]);
  });

  test('default ingestion loads only listed symbols', async () => {
    const Stock = { findAll: jest.fn().mockResolvedValue([]) };
    await expect(ingestVnstockEod({ Stock, StockPrice: {}, sequelize: {} })).resolves.toMatchObject({ received: 0 });
    expect(Stock.findAll).toHaveBeenCalledWith({
      attributes: ['code'], where: { listing_status: 'listed' }, order: [['code', 'ASC']]
    });
  });
});
