'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('portfolio_allocation_targets', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      portfolio_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'portfolios', key: 'id' }, onDelete: 'CASCADE' },
      stock_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'stocks', key: 'id' }, onDelete: 'RESTRICT' },
      target_weight_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
      alert_threshold_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 5 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex('portfolio_allocation_targets', ['portfolio_id', 'stock_id'], { unique: true, name: 'portfolio_allocation_target_unique' });
  },
  async down(queryInterface) { await queryInterface.dropTable('portfolio_allocation_targets'); }
};
