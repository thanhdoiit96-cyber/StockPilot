'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn('position_exit_evaluations', 'horizon_days', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }, { transaction });
      await queryInterface.removeIndex('position_exit_evaluations', 'position_exit_evaluations_guidance_unique', { transaction });
      await queryInterface.addIndex('position_exit_evaluations', ['guidance_id', 'horizon_days', 'schema_version'], { unique: true, name: 'position_exit_evaluations_horizon_version_unique', transaction });
      await queryInterface.sequelize.query('ALTER TABLE position_exit_evaluations ADD CONSTRAINT position_exit_evaluation_horizon_check CHECK (horizon_days IN (0,1,5,20))', { transaction });
    });
  },
  async down() { throw new Error('Forward-only migration: preserve immutable horizon evaluation history'); }
};
