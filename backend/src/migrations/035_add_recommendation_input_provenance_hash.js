'use strict';
module.exports = {
  async up(queryInterface, Sequelize) { await queryInterface.addColumn('recommendation_runs', 'input_provenance_sha256', { type: Sequelize.STRING(64), allowNull: true }); },
  async down(queryInterface) { await queryInterface.removeColumn('recommendation_runs', 'input_provenance_sha256'); }
};
