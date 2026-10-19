"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      INSERT INTO stock_prices (id, stock_id, price, created_at, updated_at)
      VALUES
        (:id1, :stock_id1, :price1, NOW(), NOW()),
        (:id2, :stock_id2, :price2, NOW(), NOW()),
        (:id3, :stock_id3, :price3, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        stock_id = EXCLUDED.stock_id,
        price = EXCLUDED.price,
        updated_at = NOW()
    `, {
      replacements: {
        id1: '00000000-0000-0000-0000-000000000011',
        stock_id1: '00000000-0000-0000-0000-000000000001',
        price1: 123.45,
        id2: '00000000-0000-0000-0000-000000000012',
        stock_id2: '00000000-0000-0000-0000-000000000002',
        price2: 87.95,
        id3: '00000000-0000-0000-0000-000000000013',
        stock_id3: '00000000-0000-0000-0000-000000000003',
        price3: 54.2
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('stock_prices', { stock_id: [
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003'
    ] }, {});
  }
};
