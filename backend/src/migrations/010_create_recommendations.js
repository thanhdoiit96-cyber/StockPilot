"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('recommendation_runs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      as_of: { type: Sequelize.DATEONLY, allowNull: false },
      horizon_days: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 20 },
      provider: { type: Sequelize.STRING(80), allowNull: false },
      model: { type: Sequelize.STRING(80), allowNull: false },
      universe_size: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      selected_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'completed' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.createTable('recommendations', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      run_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'recommendation_runs', key: 'id' }, onDelete: 'CASCADE' },
      stock_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'stocks', key: 'id' }, onDelete: 'CASCADE' },
      rank: { type: Sequelize.INTEGER, allowNull: false }, score: { type: Sequelize.DECIMAL, allowNull: false }, horizon_days: { type: Sequelize.INTEGER, allowNull: false }, entry_price: { type: Sequelize.DECIMAL, allowNull: true }, rationale: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} }, evaluated_at: { type: Sequelize.DATE, allowNull: true }, forward_return_pct: { type: Sequelize.DECIMAL, allowNull: true }, outcome: { type: Sequelize.STRING(30), allowNull: true }
    });
    await queryInterface.addIndex('recommendations', ['run_id', 'stock_id'], { unique: true, name: 'recommendations_run_stock_unique' });
    await queryInterface.addIndex('recommendation_runs', ['as_of', 'provider'], { name: 'recommendation_runs_as_of_provider' });
  },
  async down(queryInterface) { await queryInterface.dropTable('recommendations'); await queryInterface.dropTable('recommendation_runs'); }
};
