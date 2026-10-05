'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('advisor_conversations', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      user_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      title: { type: Sequelize.STRING(120), allowNull: false },
      context: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'symbol' },
      messages: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex('advisor_conversations', ['user_id', 'updated_at'], { name: 'advisor_conversations_user_updated' });
  },
  async down(queryInterface) { await queryInterface.dropTable('advisor_conversations'); }
};
