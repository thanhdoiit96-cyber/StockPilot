'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('auth_sessions', 'label', { type: Sequelize.STRING(80), allowNull: true });
  },
  async down(queryInterface) { await queryInterface.removeColumn('auth_sessions', 'label'); }
};
