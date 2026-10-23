'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('position_exit_evaluations', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      guidance_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'position_exit_guidance', key: 'id' }, onDelete: 'RESTRICT' },
      schema_version: { type: Sequelize.STRING(80), allowNull: false }, status: { type: Sequelize.STRING(24), allowNull: false },
      payload: { type: Sequelize.JSONB, allowNull: false }, payload_sha256: { type: Sequelize.STRING(64), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex('position_exit_evaluations', ['guidance_id'], { unique: true, name: 'position_exit_evaluations_guidance_unique' });
    await queryInterface.sequelize.query(`CREATE FUNCTION position_exit_evaluations_immutable() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'position exit evaluations are immutable'; END; $$ LANGUAGE plpgsql`);
    await queryInterface.sequelize.query(`CREATE TRIGGER position_exit_evaluations_no_mutation BEFORE UPDATE OR DELETE ON position_exit_evaluations FOR EACH ROW EXECUTE FUNCTION position_exit_evaluations_immutable()`);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS position_exit_evaluations_no_mutation ON position_exit_evaluations');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS position_exit_evaluations_immutable()');
    await queryInterface.dropTable('position_exit_evaluations');
  }
};
