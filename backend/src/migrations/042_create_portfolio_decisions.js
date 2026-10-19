'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('portfolio_decisions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      portfolio_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'portfolios', key: 'id' }, onDelete: 'CASCADE' },
      stock_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'stocks', key: 'id' }, onDelete: 'RESTRICT' },
      decision_type: { type: Sequelize.STRING(16), allowNull: false },
      status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'ACTIVE' },
      thesis: { type: Sequelize.TEXT, allowNull: false },
      review_date: { type: Sequelize.DATEONLY, allowNull: false },
      invalidation_condition: { type: Sequelize.TEXT, allowNull: false },
      evidence_snapshot: { type: Sequelize.JSONB, allowNull: true },
      closed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex('portfolio_decisions', ['portfolio_id', 'created_at'], { name: 'portfolio_decisions_portfolio_created' });
    await queryInterface.addIndex('portfolio_decisions', ['portfolio_id', 'status', 'review_date'], { name: 'portfolio_decisions_portfolio_status_review' });
  },
  async down(queryInterface) { await queryInterface.dropTable('portfolio_decisions'); }
};
