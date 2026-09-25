"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('stock_prices', [
      {
        id: '00000000-0000-0000-0000-000000000011',
        stock_id: '00000000-0000-0000-0000-000000000001',
        price: 123.45,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '00000000-0000-0000-0000-000000000012',
        stock_id: '00000000-0000-0000-0000-000000000002',
        price: 87.95,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '00000000-0000-0000-0000-000000000013',
        stock_id: '00000000-0000-0000-0000-000000000003',
        price: 54.2,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('stock_prices', { stock_id: [
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003'
    ] }, {});
  }
};
