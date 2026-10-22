'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('index_membership_snapshots', 'usage_scope', { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'internal_research_only' });
    await queryInterface.addColumn('index_membership_snapshots', 'rights_evidence_ref', { type: Sequelize.STRING(240), allowNull: false, defaultValue: 'pending-verification' });
    await queryInterface.sequelize.query("ALTER TABLE index_membership_snapshots ADD CONSTRAINT index_membership_usage_scope_check CHECK (usage_scope = 'internal_research_only')");
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE index_membership_snapshots DROP CONSTRAINT IF EXISTS index_membership_usage_scope_check');
    await queryInterface.removeColumn('index_membership_snapshots', 'rights_evidence_ref');
    await queryInterface.removeColumn('index_membership_snapshots', 'usage_scope');
  }
};
