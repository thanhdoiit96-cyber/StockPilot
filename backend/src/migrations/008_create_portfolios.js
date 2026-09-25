'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('portfolios', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true }, user_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' }, name: { type: Sequelize.STRING(120), allowNull: false, defaultValue: 'Danh mục chính' }, created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') }, updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') }
    });
    await queryInterface.addConstraint('portfolios', { fields: ['user_id', 'name'], type: 'unique', name: 'portfolios_user_name_unique' });
    await queryInterface.createTable('portfolio_transactions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true }, portfolio_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'portfolios', key: 'id' }, onDelete: 'CASCADE' }, stock_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'stocks', key: 'id' }, onDelete: 'CASCADE' }, side: { type: Sequelize.STRING(4), allowNull: false }, quantity: { type: Sequelize.DECIMAL(20, 6), allowNull: false }, price: { type: Sequelize.DECIMAL(20, 6), allowNull: false }, fees: { type: Sequelize.DECIMAL(20, 6), allowNull: false, defaultValue: 0 }, traded_at: { type: Sequelize.DATE, allowNull: false }, created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') }
    });
    await queryInterface.addConstraint('portfolio_transactions', { fields: ['side'], type: 'check', where: { side: ['BUY', 'SELL'] }, name: 'portfolio_transactions_side_check' });
  },
  async down(queryInterface) { await queryInterface.dropTable('portfolio_transactions'); await queryInterface.dropTable('portfolios'); }
};
