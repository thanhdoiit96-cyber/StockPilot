'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('recommendation_runs', 'snapshot_sha256', { type: Sequelize.STRING(64), allowNull: true });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('recommendation_runs', 'snapshot_sha256');
  }
};
