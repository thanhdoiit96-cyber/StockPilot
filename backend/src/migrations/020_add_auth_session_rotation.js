'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('auth_sessions', 'previous_refresh_token_hash', { type: Sequelize.STRING(64), allowNull: true });
    await queryInterface.addIndex('auth_sessions', ['previous_refresh_token_hash'], { name: 'auth_sessions_previous_refresh' });
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('auth_sessions', 'auth_sessions_previous_refresh');
    await queryInterface.removeColumn('auth_sessions', 'previous_refresh_token_hash');
  }
};
