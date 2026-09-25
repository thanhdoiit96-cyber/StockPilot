'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = process.env.VERIFY_POSTGRES_SCHEMA ? { tableName: 'market_data_reconciliation_runs', schema: process.env.VERIFY_POSTGRES_SCHEMA } : 'market_data_reconciliation_runs';
    await queryInterface.createTable(table, {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true, allowNull: false },
      provider_a: { type: Sequelize.STRING(80), allowNull: false }, source_a: { type: Sequelize.STRING(80), allowNull: false },
      provider_b: { type: Sequelize.STRING(80), allowNull: false }, source_b: { type: Sequelize.STRING(80), allowNull: false },
      status: { type: Sequelize.STRING(20), allowNull: false }, interval: { type: Sequelize.STRING(10), allowNull: false },
      from_date: Sequelize.DATEONLY, to_date: Sequelize.DATEONLY,
      symbols: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      received_a: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }, received_b: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }, compared: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      counts: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} }, results: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] }, errors: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      close_tolerance: { type: Sequelize.DECIMAL, allowNull: false }, volume_tolerance: { type: Sequelize.DECIMAL, allowNull: false },
      started_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }, completed_at: Sequelize.DATE,
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }, updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex(table, ['status', 'started_at'], { name: 'idx_reconciliation_runs_status_started' });
  },
  async down(queryInterface) {
    const table = process.env.VERIFY_POSTGRES_SCHEMA ? { tableName: 'market_data_reconciliation_runs', schema: process.env.VERIFY_POSTGRES_SCHEMA } : 'market_data_reconciliation_runs';
    await queryInterface.dropTable(table);
  }
};
