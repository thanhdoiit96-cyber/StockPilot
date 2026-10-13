'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('foreign_flow_daily', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      stock_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'stocks', key: 'id' }, onDelete: 'RESTRICT' },
      provider: { type: Sequelize.STRING(80), allowNull: false }, source: { type: Sequelize.STRING(80), allowNull: false },
      provider_symbol: { type: Sequelize.STRING(80), allowNull: false }, session_date: { type: Sequelize.DATEONLY, allowNull: false },
      buy_volume: { type: Sequelize.DECIMAL, allowNull: false }, sell_volume: { type: Sequelize.DECIMAL, allowNull: false },
      buy_value: { type: Sequelize.DECIMAL, allowNull: false }, sell_value: { type: Sequelize.DECIMAL, allowNull: false },
      currency: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'VND' },
      license: { type: Sequelize.STRING(80), allowNull: false }, license_url: { type: Sequelize.TEXT, allowNull: true },
      source_hash: { type: Sequelize.STRING(64), allowNull: false }, fetched_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex('foreign_flow_daily', ['stock_id', 'provider', 'source', 'session_date'], { unique: true, name: 'foreign_flow_daily_observation_unique' });
    await queryInterface.addIndex('foreign_flow_daily', ['session_date', 'stock_id'], { name: 'foreign_flow_daily_session_stock' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('foreign_flow_daily');
  }
};
