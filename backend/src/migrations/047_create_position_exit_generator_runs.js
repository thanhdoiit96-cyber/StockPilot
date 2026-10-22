'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('position_exit_generator_runs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      run_key: { type: Sequelize.STRING(64), allowNull: false, unique: true }, trigger_id: { type: Sequelize.STRING(160), allowNull: false },
      provider: { type: Sequelize.STRING(80), allowNull: false }, session_date: { type: Sequelize.DATEONLY, allowNull: false }, model: { type: Sequelize.STRING(80), allowNull: false },
      owner_id: { type: Sequelize.STRING(160), allowNull: false }, mode: { type: Sequelize.STRING(24), allowNull: false }, status: { type: Sequelize.STRING(30), allowNull: false },
      input_evidence: { type: Sequelize.JSONB, allowNull: false }, result_summary: { type: Sequelize.JSONB, allowNull: false }, created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex('position_exit_generator_runs', ['provider', 'session_date', 'model', 'created_at'], { name: 'position_exit_generator_runs_session_idx' });
    await queryInterface.sequelize.query("CREATE FUNCTION position_exit_generator_runs_immutable() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'position exit generator runs are immutable'; END; $$ LANGUAGE plpgsql");
    await queryInterface.sequelize.query('CREATE TRIGGER position_exit_generator_runs_no_mutation BEFORE UPDATE OR DELETE ON position_exit_generator_runs FOR EACH ROW EXECUTE FUNCTION position_exit_generator_runs_immutable()');
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS position_exit_generator_runs_no_mutation ON position_exit_generator_runs');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS position_exit_generator_runs_immutable()');
    await queryInterface.dropTable('position_exit_generator_runs');
  }
};
