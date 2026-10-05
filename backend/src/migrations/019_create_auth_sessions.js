'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('auth_sessions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      user_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      refresh_token_hash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      csrf_token_hash: { type: Sequelize.STRING(64), allowNull: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      idle_expires_at: { type: Sequelize.DATE, allowNull: false },
      last_used_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      revoke_reason: { type: Sequelize.STRING(40), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex('auth_sessions', ['user_id', 'revoked_at'], { name: 'auth_sessions_user_revoked' });
    await queryInterface.addIndex('auth_sessions', ['expires_at'], { name: 'auth_sessions_expires' });
    await queryInterface.addIndex('auth_sessions', ['idle_expires_at'], { name: 'auth_sessions_idle_expires' });
  },
  async down(queryInterface) { await queryInterface.dropTable('auth_sessions'); }
};
