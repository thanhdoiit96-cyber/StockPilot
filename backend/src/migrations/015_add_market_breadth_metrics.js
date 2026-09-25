'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = process.env.VERIFY_POSTGRES_SCHEMA ? { tableName: 'stock_prices', schema: process.env.VERIFY_POSTGRES_SCHEMA } : 'stock_prices';
    const existing = await queryInterface.describeTable(table);
    const columns = {
      trade_count: { type: Sequelize.DECIMAL, allowNull: true },
      traded_value: { type: Sequelize.DECIMAL, allowNull: true },
      reference_price: { type: Sequelize.DECIMAL, allowNull: true },
      ceiling_price: { type: Sequelize.DECIMAL, allowNull: true },
      floor_price: { type: Sequelize.DECIMAL, allowNull: true }
    };
    for (const [name, definition] of Object.entries(columns)) if (!existing[name]) await queryInterface.addColumn(table, name, definition);
  },
  async down(queryInterface) {
    const table = process.env.VERIFY_POSTGRES_SCHEMA ? { tableName: 'stock_prices', schema: process.env.VERIFY_POSTGRES_SCHEMA } : 'stock_prices';
    const existing = await queryInterface.describeTable(table);
    for (const name of ['trade_count', 'traded_value', 'reference_price', 'ceiling_price', 'floor_price']) if (existing[name]) await queryInterface.removeColumn(table, name);
  }
};
