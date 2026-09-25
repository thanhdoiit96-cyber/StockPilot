"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stock_prices', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        allowNull: false,
        primaryKey: true
      },
      stock_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'stocks', key: 'id' },
        onDelete: 'CASCADE'
      },
      price: {
        type: Sequelize.DECIMAL,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });
  },

  async down(queryInterface /* Sequelize */) {
    await queryInterface.dropTable('stock_prices');
  }
};
