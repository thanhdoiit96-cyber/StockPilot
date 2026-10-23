'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('position_exit_worker_lease_events', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      lease_key: { type: Sequelize.STRING(180), allowNull: false },
      owner_id: { type: Sequelize.STRING(160), allowNull: false },
      fencing_token: { type: Sequelize.BIGINT, allowNull: false },
      event_type: { type: Sequelize.STRING(40), allowNull: false },
      details: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      recorded_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex('position_exit_worker_lease_events', ['lease_key', 'recorded_at'], { name: 'position_exit_worker_lease_events_lookup_idx' });
    await queryInterface.sequelize.query("CREATE FUNCTION position_exit_worker_lease_events_immutable() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'position exit worker lease events are immutable'; END; $$ LANGUAGE plpgsql");
    await queryInterface.sequelize.query('CREATE TRIGGER position_exit_worker_lease_events_no_mutation BEFORE UPDATE OR DELETE ON position_exit_worker_lease_events FOR EACH ROW EXECUTE FUNCTION position_exit_worker_lease_events_immutable()');
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS position_exit_worker_lease_events_no_mutation ON position_exit_worker_lease_events');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS position_exit_worker_lease_events_immutable()');
    await queryInterface.dropTable('position_exit_worker_lease_events');
  }
};
