'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn('users', 'preferred_language', { type: Sequelize.STRING(5), allowNull: false, defaultValue: 'vi' }, { transaction });
      await queryInterface.addColumn('users', 'timezone', { type: Sequelize.STRING(64), allowNull: false, defaultValue: 'Asia/Ho_Chi_Minh' }, { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.removeColumn('users', 'timezone', { transaction });
      await queryInterface.removeColumn('users', 'preferred_language', { transaction });
    });
  }
};
