'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'theme_preference', {
      type: Sequelize.STRING(10), allowNull: false, defaultValue: 'dark'
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'theme_preference');
  }
};
