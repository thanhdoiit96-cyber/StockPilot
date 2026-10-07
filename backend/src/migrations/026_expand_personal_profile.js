'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      for (const [name, type] of [['full_name', Sequelize.STRING(120)], ['phone', Sequelize.STRING(16)], ['date_of_birth', Sequelize.DATEONLY]]) {
        await queryInterface.addColumn('users', name, { type, allowNull: true }, { transaction });
      }
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      for (const name of ['date_of_birth', 'phone', 'full_name']) await queryInterface.removeColumn('users', name, { transaction });
    });
  }
};
