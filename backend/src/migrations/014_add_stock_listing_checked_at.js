'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = process.env.VERIFY_POSTGRES_SCHEMA
      ? { tableName: 'stocks', schema: process.env.VERIFY_POSTGRES_SCHEMA }
      : 'stocks';
    const existing = await queryInterface.describeTable(table);
    if (!existing.listing_checked_at) await queryInterface.addColumn(table, 'listing_checked_at', { type: Sequelize.DATE, allowNull: true });
  },
  async down(queryInterface) {
    const table = process.env.VERIFY_POSTGRES_SCHEMA
      ? { tableName: 'stocks', schema: process.env.VERIFY_POSTGRES_SCHEMA }
      : 'stocks';
    const existing = await queryInterface.describeTable(table);
    if (existing.listing_checked_at) await queryInterface.removeColumn(table, 'listing_checked_at');
  }
};
