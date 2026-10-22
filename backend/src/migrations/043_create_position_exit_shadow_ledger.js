'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('position_exit_runs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      portfolio_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'portfolios', key: 'id' }, onDelete: 'RESTRICT' },
      as_of: { type: Sequelize.DATEONLY, allowNull: false }, provider: { type: Sequelize.STRING(80), allowNull: false },
      model: { type: Sequelize.STRING(80), allowNull: false }, generation_key: { type: Sequelize.STRING(64), allowNull: false },
      input_provenance: { type: Sequelize.JSONB, allowNull: false }, input_provenance_sha256: { type: Sequelize.STRING(64), allowNull: false },
      snapshot_sha256: { type: Sequelize.STRING(64), allowNull: false }, status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'shadow' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.createTable('position_exit_guidance', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      run_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'position_exit_runs', key: 'id' }, onDelete: 'RESTRICT' },
      stock_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'stocks', key: 'id' }, onDelete: 'RESTRICT' },
      status: { type: Sequelize.STRING(40), allowNull: false }, payload: { type: Sequelize.JSONB, allowNull: false }, payload_sha256: { type: Sequelize.STRING(64), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex('position_exit_runs', ['generation_key'], { unique: true, name: 'position_exit_runs_generation_key_unique' });
    await queryInterface.addIndex('position_exit_guidance', ['run_id', 'stock_id'], { unique: true, name: 'position_exit_guidance_run_stock_unique' });
    await queryInterface.sequelize.query(`CREATE FUNCTION position_exit_records_immutable() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'position exit records are immutable'; END; $$ LANGUAGE plpgsql`);
    await queryInterface.sequelize.query(`CREATE TRIGGER position_exit_runs_no_mutation BEFORE UPDATE OR DELETE ON position_exit_runs FOR EACH ROW EXECUTE FUNCTION position_exit_records_immutable()`);
    await queryInterface.sequelize.query(`CREATE TRIGGER position_exit_guidance_no_mutation BEFORE UPDATE OR DELETE ON position_exit_guidance FOR EACH ROW EXECUTE FUNCTION position_exit_records_immutable()`);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS position_exit_guidance_no_mutation ON position_exit_guidance');
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS position_exit_runs_no_mutation ON position_exit_runs');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS position_exit_records_immutable()');
    await queryInterface.dropTable('position_exit_guidance'); await queryInterface.dropTable('position_exit_runs');
  }
};
