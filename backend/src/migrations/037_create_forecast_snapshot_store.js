'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('forecast_snapshots', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      generation_key: { type: Sequelize.STRING(64), allowNull: false },
      schema_version: { type: Sequelize.STRING(60), allowNull: false },
      provider: { type: Sequelize.STRING(80), allowNull: false },
      model_version: { type: Sequelize.STRING(120), allowNull: false },
      horizon_sessions: { type: Sequelize.INTEGER, allowNull: false },
      as_of: { type: Sequelize.DATEONLY, allowNull: false },
      target_session: { type: Sequelize.DATEONLY, allowNull: true },
      synthetic: { type: Sequelize.BOOLEAN, allowNull: false },
      research_only: { type: Sequelize.BOOLEAN, allowNull: false },
      payload: { type: Sequelize.JSONB, allowNull: false },
      payload_sha256: { type: Sequelize.STRING(64), allowNull: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addConstraint('forecast_snapshots', { fields: ['horizon_sessions'], type: 'check', where: { horizon_sessions: [1, 5] }, name: 'forecast_snapshots_horizon_check' });
    await queryInterface.addIndex('forecast_snapshots', ['generation_key'], { unique: true, name: 'forecast_snapshots_generation_key_unique' });
    await queryInterface.addIndex('forecast_snapshots', ['horizon_sessions', 'as_of', 'id'], { name: 'forecast_snapshots_history_cursor' });
    await queryInterface.addIndex('forecast_snapshots', ['expires_at'], { name: 'forecast_snapshots_expires_at' });
    await queryInterface.createTable('forecast_outcome_events', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      snapshot_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'forecast_snapshots', key: 'id' }, onDelete: 'RESTRICT' },
      schema_version: { type: Sequelize.STRING(60), allowNull: false },
      payload: { type: Sequelize.JSONB, allowNull: false },
      payload_sha256: { type: Sequelize.STRING(64), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('forecast_outcome_events', ['snapshot_id'], { unique: true, name: 'forecast_outcome_events_snapshot_unique' });
    await queryInterface.sequelize.query(`CREATE FUNCTION forecast_records_immutable() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'forecast records are immutable'; END; $$ LANGUAGE plpgsql`);
    await queryInterface.sequelize.query(`CREATE TRIGGER forecast_snapshots_no_mutation BEFORE UPDATE OR DELETE ON forecast_snapshots FOR EACH ROW EXECUTE FUNCTION forecast_records_immutable()`);
    await queryInterface.sequelize.query(`CREATE TRIGGER forecast_outcome_events_no_mutation BEFORE UPDATE OR DELETE ON forecast_outcome_events FOR EACH ROW EXECUTE FUNCTION forecast_records_immutable()`);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS forecast_outcome_events_no_mutation ON forecast_outcome_events');
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS forecast_snapshots_no_mutation ON forecast_snapshots');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS forecast_records_immutable()');
    await queryInterface.dropTable('forecast_outcome_events');
    await queryInterface.dropTable('forecast_snapshots');
  }
};
