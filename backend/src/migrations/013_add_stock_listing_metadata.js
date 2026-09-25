'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = process.env.VERIFY_POSTGRES_SCHEMA
      ? { tableName: 'stocks', schema: process.env.VERIFY_POSTGRES_SCHEMA }
      : 'stocks';
    const existing = await queryInterface.describeTable(table);
    if (!existing.exchange) await queryInterface.addColumn(table, 'exchange', { type: Sequelize.STRING(40), allowNull: true });
    if (!existing.listing_status) await queryInterface.addColumn(table, 'listing_status', { type: Sequelize.STRING(20), allowNull: true });
  },
  async down(queryInterface) {
    const table = process.env.VERIFY_POSTGRES_SCHEMA
      ? { tableName: 'stocks', schema: process.env.VERIFY_POSTGRES_SCHEMA }
      : 'stocks';
    const existing = await queryInterface.describeTable(table);
    if (existing.listing_status) await queryInterface.removeColumn(table, 'listing_status');
    if (existing.exchange) await queryInterface.removeColumn(table, 'exchange');
  }
};
