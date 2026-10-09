'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('recommendation_evaluation_events', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      recommendation_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'recommendations', key: 'id' }, onDelete: 'RESTRICT' },
      run_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'recommendation_runs', key: 'id' }, onDelete: 'RESTRICT' },
      event_type: { type: Sequelize.STRING(40), allowNull: false },
      schema_version: { type: Sequelize.STRING(60), allowNull: false },
      payload: { type: Sequelize.JSONB, allowNull: false },
      payload_sha256: { type: Sequelize.STRING(64), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('recommendation_evaluation_events', ['recommendation_id', 'event_type'], { unique: true, name: 'recommendation_evaluation_events_unique_type' });
    await queryInterface.addIndex('recommendation_evaluation_events', ['run_id', 'created_at'], { name: 'recommendation_evaluation_events_run_created' });
    await queryInterface.sequelize.query(`CREATE FUNCTION recommendation_evaluation_events_immutable() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'recommendation evaluation events are immutable'; END; $$ LANGUAGE plpgsql`);
    await queryInterface.sequelize.query(`CREATE TRIGGER recommendation_evaluation_events_no_mutation BEFORE UPDATE OR DELETE ON recommendation_evaluation_events FOR EACH ROW EXECUTE FUNCTION recommendation_evaluation_events_immutable()`);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS recommendation_evaluation_events_no_mutation ON recommendation_evaluation_events');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS recommendation_evaluation_events_immutable()');
    await queryInterface.dropTable('recommendation_evaluation_events');
  }
};
