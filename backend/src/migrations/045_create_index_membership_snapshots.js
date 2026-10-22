'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('index_membership_snapshots', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true }, index_code: { type: Sequelize.STRING(24), allowNull: false }, status: { type: Sequelize.STRING(20), allowNull: false },
      effective_from: { type: Sequelize.DATEONLY, allowNull: false }, effective_to: { type: Sequelize.DATEONLY, allowNull: true }, source_identifier: { type: Sequelize.STRING(160), allowNull: false }, source_url: { type: Sequelize.TEXT, allowNull: false }, source_published_at: { type: Sequelize.DATE, allowNull: true },
      member_count: { type: Sequelize.INTEGER, allowNull: false }, membership_sha256: { type: Sequelize.STRING(64), allowNull: false }, source_sha256: { type: Sequelize.STRING(64), allowNull: false }, ingested_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.createTable('index_membership_constituents', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true }, snapshot_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'index_membership_snapshots', key: 'id' }, onDelete: 'RESTRICT' }, symbol: { type: Sequelize.STRING(12), allowNull: false }, rank: { type: Sequelize.INTEGER, allowNull: true }, source_identifier: { type: Sequelize.STRING(160), allowNull: false }, created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex('index_membership_snapshots', ['index_code', 'effective_from', 'membership_sha256'], { unique: true, name: 'index_membership_snapshot_unique' });
    await queryInterface.addIndex('index_membership_constituents', ['snapshot_id', 'symbol'], { unique: true, name: 'index_membership_constituent_unique' });
    await queryInterface.sequelize.query("CREATE FUNCTION index_membership_records_immutable() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'index membership records are immutable'; END; $$ LANGUAGE plpgsql");
    await queryInterface.sequelize.query('CREATE TRIGGER index_membership_snapshots_no_mutation BEFORE UPDATE OR DELETE ON index_membership_snapshots FOR EACH ROW EXECUTE FUNCTION index_membership_records_immutable()');
    await queryInterface.sequelize.query('CREATE TRIGGER index_membership_constituents_no_mutation BEFORE UPDATE OR DELETE ON index_membership_constituents FOR EACH ROW EXECUTE FUNCTION index_membership_records_immutable()');
  },
  async down(queryInterface) { await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS index_membership_constituents_no_mutation ON index_membership_constituents'); await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS index_membership_snapshots_no_mutation ON index_membership_snapshots'); await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS index_membership_records_immutable()'); await queryInterface.dropTable('index_membership_constituents'); await queryInterface.dropTable('index_membership_snapshots'); }
};
