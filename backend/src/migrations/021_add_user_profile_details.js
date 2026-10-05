'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'display_name', { type: Sequelize.STRING(120), allowNull: true });
    await queryInterface.addColumn('users', 'email_verified_at', { type: Sequelize.DATE, allowNull: true });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'email_verified_at');
    await queryInterface.removeColumn('users', 'display_name');
  }
};
