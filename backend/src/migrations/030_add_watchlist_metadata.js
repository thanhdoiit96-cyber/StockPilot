'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn('watchlist_items', 'status', { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'WATCHING' }, { transaction });
      await queryInterface.addColumn('watchlist_items', 'note', { type: Sequelize.STRING(280), allowNull: true }, { transaction });
      await queryInterface.addColumn('watchlist_items', 'metadata_updated_at', { type: Sequelize.DATE, allowNull: true }, { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      for (const name of ['metadata_updated_at', 'note', 'status']) await queryInterface.removeColumn('watchlist_items', name, { transaction });
    });
  }
};
