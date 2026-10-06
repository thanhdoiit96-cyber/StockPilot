'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('portfolio_cash_flows', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      portfolio_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'portfolios', key: 'id' }, onDelete: 'CASCADE' },
      type: { type: Sequelize.STRING(12), allowNull: false },
      amount: { type: Sequelize.DECIMAL(20, 2), allowNull: false },
      occurred_at: { type: Sequelize.DATE, allowNull: false },
      note: { type: Sequelize.STRING(240), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') }
    });
    await queryInterface.addConstraint('portfolio_cash_flows', { fields: ['type'], type: 'check', where: { type: ['DEPOSIT', 'WITHDRAWAL'] }, name: 'portfolio_cash_flows_type_check' });
    await queryInterface.addConstraint('portfolio_cash_flows', { fields: ['amount'], type: 'check', where: { amount: { [Sequelize.Op.gt]: 0 } }, name: 'portfolio_cash_flows_amount_positive' });
    await queryInterface.addIndex('portfolio_cash_flows', ['portfolio_id', 'occurred_at', 'id'], { name: 'portfolio_cash_flows_timeline_idx' });
  },
  async down(queryInterface) { await queryInterface.dropTable('portfolio_cash_flows'); }
};
