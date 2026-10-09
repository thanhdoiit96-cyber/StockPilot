'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('recommendation_runs', 'generation_key', { type: Sequelize.STRING(64), allowNull: true });
    await queryInterface.addIndex('recommendation_runs', ['generation_key'], { unique: true, name: 'recommendation_runs_generation_key_unique' });
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('recommendation_runs', 'recommendation_runs_generation_key_unique');
    await queryInterface.removeColumn('recommendation_runs', 'generation_key');
  }
};
