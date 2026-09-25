'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = process.env.VERIFY_POSTGRES_SCHEMA
      ? { tableName: 'market_data_ingestion_runs', schema: process.env.VERIFY_POSTGRES_SCHEMA }
      : 'market_data_ingestion_runs';
    await queryInterface.createTable(table, {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), allowNull: false, primaryKey: true },
      provider: { type: Sequelize.STRING(80), allowNull: false },
      source: { type: Sequelize.STRING(80), allowNull: false },
      status: { type: Sequelize.STRING(20), allowNull: false },
      interval: { type: Sequelize.STRING(10), allowNull: false, defaultValue: '1d' },
      from_date: { type: Sequelize.DATEONLY, allowNull: true },
      to_date: { type: Sequelize.DATEONLY, allowNull: true },
      symbols: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      received: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      inserted: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      updated: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      skipped: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      rejected: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      errors: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      started_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex(table, ['provider', 'status', 'started_at'], { name: 'idx_ingestion_runs_provider_status_started' });
  },

  async down(queryInterface) {
    const table = process.env.VERIFY_POSTGRES_SCHEMA
      ? { tableName: 'market_data_ingestion_runs', schema: process.env.VERIFY_POSTGRES_SCHEMA }
      : 'market_data_ingestion_runs';
    await queryInterface.dropTable(table);
  }
};
