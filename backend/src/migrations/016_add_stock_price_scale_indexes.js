'use strict';

module.exports = {
  async up(queryInterface) {
    const table = process.env.VERIFY_POSTGRES_SCHEMA
      ? { tableName: 'stock_prices', schema: process.env.VERIFY_POSTGRES_SCHEMA }
      : 'stock_prices';
    const existing = new Set((await queryInterface.showIndex(table)).map(index => index.name));
    const indexes = [
      ['idx_stock_prices_stock_observed_at', ['stock_id', 'observed_at']],
      ['idx_stock_prices_provider_interval_observed_at', ['provider', 'interval', 'observed_at']]
    ];
    for (const [name, fields] of indexes) {
      if (!existing.has(name)) await queryInterface.addIndex(table, fields, { name });
    }
  },

  async down(queryInterface) {
    const table = process.env.VERIFY_POSTGRES_SCHEMA
      ? { tableName: 'stock_prices', schema: process.env.VERIFY_POSTGRES_SCHEMA }
      : 'stock_prices';
    for (const name of ['idx_stock_prices_provider_interval_observed_at', 'idx_stock_prices_stock_observed_at']) {
      await queryInterface.removeIndex(table, name);
    }
  }
};
