'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = process.env.VERIFY_POSTGRES_SCHEMA ? { tableName: 'external_factors', schema: process.env.VERIFY_POSTGRES_SCHEMA } : 'external_factors';
    await queryInterface.createTable(table, {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true, allowNull: false },
      type: { type: Sequelize.STRING(30), allowNull: false }, symbol: { type: Sequelize.STRING(30), allowNull: true },
      title: { type: Sequelize.STRING(500), allowNull: true }, summary: { type: Sequelize.TEXT, allowNull: true },
      source: { type: Sequelize.STRING(160), allowNull: false }, source_url: { type: Sequelize.TEXT, allowNull: true },
      published_at: { type: Sequelize.DATE, allowNull: false }, fetched_at: { type: Sequelize.DATE, allowNull: false },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'unverified' }, impact: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'unknown' },
      provider_license: { type: Sequelize.STRING(255), allowNull: true }, raw_payload: { type: Sequelize.JSONB, allowNull: true },
      source_hash: { type: Sequelize.STRING(64), allowNull: false }, created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }, updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex(table, ['type', 'symbol', 'published_at'], { name: 'idx_external_factors_type_symbol_published' });
    await queryInterface.addIndex(table, ['source_hash'], { name: 'uq_external_factors_source_hash', unique: true });
  },
  async down(queryInterface) { const table = process.env.VERIFY_POSTGRES_SCHEMA ? { tableName: 'external_factors', schema: process.env.VERIFY_POSTGRES_SCHEMA } : 'external_factors'; await queryInterface.dropTable(table); }
};
