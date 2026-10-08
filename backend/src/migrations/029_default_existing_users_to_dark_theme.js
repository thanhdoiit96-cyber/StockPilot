'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.changeColumn('users', 'theme_preference', { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'dark' }, { transaction });
      await queryInterface.bulkUpdate('users', { theme_preference: 'dark' }, { theme_preference: 'system' }, { transaction });
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'theme_preference', { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'system' });
  }
};
