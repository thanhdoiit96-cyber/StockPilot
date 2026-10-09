'use strict';
module.exports = {
  async up(queryInterface, Sequelize) { await queryInterface.addColumn('recommendation_runs', 'input_provenance', { type: Sequelize.JSONB, allowNull: true }); },
  async down(queryInterface) { await queryInterface.removeColumn('recommendation_runs', 'input_provenance'); }
};
