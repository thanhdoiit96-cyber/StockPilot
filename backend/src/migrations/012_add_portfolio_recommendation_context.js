'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = process.env.VERIFY_POSTGRES_SCHEMA ? { tableName: 'portfolio_transactions', schema: process.env.VERIFY_POSTGRES_SCHEMA } : 'portfolio_transactions';
    await queryInterface.addColumn(table, 'recommendation_context', {
      type: Sequelize.JSONB,
      allowNull: true
    });
  },
  async down(queryInterface) {
    const table = process.env.VERIFY_POSTGRES_SCHEMA ? { tableName: 'portfolio_transactions', schema: process.env.VERIFY_POSTGRES_SCHEMA } : 'portfolio_transactions';
    await queryInterface.removeColumn(table, 'recommendation_context');
  }
};
