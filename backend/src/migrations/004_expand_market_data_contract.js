'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = process.env.VERIFY_POSTGRES_SCHEMA
      ? { tableName: 'stock_prices', schema: process.env.VERIFY_POSTGRES_SCHEMA }
      : 'stock_prices';
    const columns = {
      provider: Sequelize.STRING(80), provider_symbol: Sequelize.STRING(80), interval: Sequelize.STRING(10),
      observed_at: Sequelize.DATE, fetched_at: Sequelize.DATE, open: Sequelize.DECIMAL, high: Sequelize.DECIMAL,
      low: Sequelize.DECIMAL, close: Sequelize.DECIMAL, volume: Sequelize.DECIMAL, currency: Sequelize.STRING(10),
      price_unit: Sequelize.STRING(40), is_adjusted: Sequelize.BOOLEAN, source_hash: Sequelize.STRING(64)
    };
    const existing = await queryInterface.describeTable(table);
    for (const [name, type] of Object.entries(columns)) {
      if (!existing[name]) await queryInterface.addColumn(table, name, { type, allowNull: true });
    }
    const indexes = await queryInterface.showIndex(table);
    const names = new Set(indexes.map(index => index.name));
    if (!names.has('uq_stock_prices_market_observation')) {
      await queryInterface.addIndex(table, ['stock_id', 'provider', 'interval', 'observed_at'], { name: 'uq_stock_prices_market_observation', unique: true });
    }
    if (!names.has('idx_stock_prices_provider_observed_at')) {
      await queryInterface.addIndex(table, ['provider', 'observed_at'], { name: 'idx_stock_prices_provider_observed_at' });
    }
  },
  async down(queryInterface) {
    const table = process.env.VERIFY_POSTGRES_SCHEMA
      ? { tableName: 'stock_prices', schema: process.env.VERIFY_POSTGRES_SCHEMA }
      : 'stock_prices';
    await queryInterface.removeIndex(table, 'idx_stock_prices_provider_observed_at');
    await queryInterface.removeIndex(table, 'uq_stock_prices_market_observation');
    for (const name of ['provider', 'provider_symbol', 'interval', 'observed_at', 'fetched_at', 'open', 'high', 'low', 'close', 'volume', 'currency', 'price_unit', 'is_adjusted', 'source_hash']) await queryInterface.removeColumn(table, name);
  }
};
