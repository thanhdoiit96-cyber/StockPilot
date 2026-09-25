'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('saved_recommendation_snapshots', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      user_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      criteria: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      result: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex('saved_recommendation_snapshots', ['user_id', 'created_at'], { name: 'saved_recommendations_user_created' });
  },
  async down(queryInterface) { await queryInterface.dropTable('saved_recommendation_snapshots'); }
};
