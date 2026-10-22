'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('holding_reconciliation_runs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      portfolio_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'portfolios', key: 'id' }, onDelete: 'RESTRICT' },
      as_of: { type: Sequelize.DATEONLY, allowNull: false }, model: { type: Sequelize.STRING(80), allowNull: false }, generation_key: { type: Sequelize.STRING(64), allowNull: false },
      input_provenance: { type: Sequelize.JSONB, allowNull: false }, input_provenance_sha256: { type: Sequelize.STRING(64), allowNull: false }, snapshot_sha256: { type: Sequelize.STRING(64), allowNull: false },
      status: { type: Sequelize.STRING(30), allowNull: false }, created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.createTable('holding_reconciliation_applications', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true }, run_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'holding_reconciliation_runs', key: 'id' }, onDelete: 'RESTRICT' },
      stock_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'stocks', key: 'id' }, onDelete: 'RESTRICT' }, status: { type: Sequelize.STRING(30), allowNull: false }, payload: { type: Sequelize.JSONB, allowNull: false }, payload_sha256: { type: Sequelize.STRING(64), allowNull: false }, created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex('holding_reconciliation_runs', ['generation_key'], { unique: true, name: 'holding_reconciliation_runs_generation_key_unique' });
    await queryInterface.addIndex('holding_reconciliation_applications', ['run_id', 'stock_id'], { unique: true, name: 'holding_reconciliation_applications_run_stock_unique' });
    await queryInterface.sequelize.query("CREATE FUNCTION holding_reconciliation_records_immutable() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'holding reconciliation records are immutable'; END; $$ LANGUAGE plpgsql");
    await queryInterface.sequelize.query('CREATE TRIGGER holding_reconciliation_runs_no_mutation BEFORE UPDATE OR DELETE ON holding_reconciliation_runs FOR EACH ROW EXECUTE FUNCTION holding_reconciliation_records_immutable()');
    await queryInterface.sequelize.query('CREATE TRIGGER holding_reconciliation_applications_no_mutation BEFORE UPDATE OR DELETE ON holding_reconciliation_applications FOR EACH ROW EXECUTE FUNCTION holding_reconciliation_records_immutable()');
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS holding_reconciliation_applications_no_mutation ON holding_reconciliation_applications');
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS holding_reconciliation_runs_no_mutation ON holding_reconciliation_runs');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS holding_reconciliation_records_immutable()');
    await queryInterface.dropTable('holding_reconciliation_applications'); await queryInterface.dropTable('holding_reconciliation_runs');
  }
};
