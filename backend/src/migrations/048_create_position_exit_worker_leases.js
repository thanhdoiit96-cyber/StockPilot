'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('position_exit_worker_leases', {
      lease_key: { type: Sequelize.STRING(180), allowNull: false, primaryKey: true },
      owner_id: { type: Sequelize.STRING(160), allowNull: false },
      fencing_token: { type: Sequelize.BIGINT, allowNull: false },
      acquired_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      heartbeat_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      lease_expires_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex('position_exit_worker_leases', ['lease_expires_at'], { name: 'position_exit_worker_leases_expiry_idx' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('position_exit_worker_leases');
  }
};
