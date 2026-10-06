'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('portfolio_events', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      portfolio_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'portfolios', key: 'id' }, onDelete: 'CASCADE' },
      stock_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'stocks', key: 'id' }, onDelete: 'RESTRICT' },
      event_type: { type: Sequelize.STRING(24), allowNull: false },
      status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'PENDING' },
      schema_version: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      record_date: { type: Sequelize.DATEONLY, allowNull: false },
      effective_date: { type: Sequelize.DATEONLY, allowNull: true },
      payment_date: { type: Sequelize.DATEONLY, allowNull: true },
      entitlement_quantity: { type: Sequelize.DECIMAL(20, 6), allowNull: false },
      payload: { type: Sequelize.JSONB, allowNull: false },
      source_type: { type: Sequelize.STRING(12), allowNull: false, defaultValue: 'MANUAL' },
      source_name: { type: Sequelize.STRING(120), allowNull: true },
      source_url: { type: Sequelize.TEXT, allowNull: true },
      source_reference: { type: Sequelize.STRING(200), allowNull: true },
      announced_at: { type: Sequelize.DATE, allowNull: true },
      fetched_at: { type: Sequelize.DATE, allowNull: true },
      verification_status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'UNVERIFIED' },
      supersedes_event_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'portfolio_events', key: 'id' }, onDelete: 'RESTRICT' },
      note: { type: Sequelize.STRING(240), allowNull: true },
      created_by: { type: Sequelize.STRING(80), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') }
    });
    await queryInterface.addConstraint('portfolio_events', { fields: ['event_type'], type: 'check', where: { event_type: ['CASH_DIVIDEND', 'STOCK_DIVIDEND', 'STOCK_SPLIT', 'RIGHTS_ISSUE'] }, name: 'portfolio_events_type_check' });
    await queryInterface.addConstraint('portfolio_events', { fields: ['status'], type: 'check', where: { status: ['PENDING', 'CONFIRMED', 'CANCELLED', 'SUPERSEDED'] }, name: 'portfolio_events_status_check' });
    await queryInterface.addConstraint('portfolio_events', { fields: ['source_type'], type: 'check', where: { source_type: ['MANUAL', 'PROVIDER'] }, name: 'portfolio_events_source_type_check' });
    await queryInterface.addConstraint('portfolio_events', { fields: ['verification_status'], type: 'check', where: { verification_status: ['UNVERIFIED', 'USER_CONFIRMED', 'SOURCE_VERIFIED'] }, name: 'portfolio_events_verification_check' });
    await queryInterface.addConstraint('portfolio_events', { fields: ['schema_version'], type: 'check', where: { schema_version: { [Sequelize.Op.gte]: 1 } }, name: 'portfolio_events_schema_version_check' });
    await queryInterface.addConstraint('portfolio_events', { fields: ['entitlement_quantity'], type: 'check', where: { entitlement_quantity: { [Sequelize.Op.gte]: 0 } }, name: 'portfolio_events_entitlement_nonnegative' });
    await queryInterface.addIndex('portfolio_events', ['portfolio_id', 'record_date', 'id'], { name: 'portfolio_events_timeline_idx' });
    await queryInterface.addIndex('portfolio_events', ['portfolio_id', 'status', 'effective_date'], { name: 'portfolio_events_valuation_idx' });
    await queryInterface.addIndex('portfolio_events', ['stock_id', 'record_date'], { name: 'portfolio_events_stock_date_idx' });
    await queryInterface.addIndex('portfolio_events', ['portfolio_id', 'source_type', 'source_name', 'source_reference'], { unique: true, where: { source_reference: { [Sequelize.Op.ne]: null } }, name: 'portfolio_events_source_reference_uq' });
  },
  async down(queryInterface) { await queryInterface.dropTable('portfolio_events'); }
};
