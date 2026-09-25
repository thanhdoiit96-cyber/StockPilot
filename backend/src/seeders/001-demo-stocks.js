"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('stocks', [
      {
        id: '00000000-0000-0000-0000-000000000001',
        code: 'FPT',
        name: 'FPT Corporation',
        industry: 'Technology',
        market_cap: 123456789.12,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        code: 'VHM',
        name: 'Vinhomes',
        industry: 'Real Estate',
        market_cap: 98765432.56,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        code: 'MWG',
        name: 'Mobile World',
        industry: 'Consumer',
        market_cap: 76854321.34,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('stocks', { code: ['FPT', 'VHM', 'MWG'] }, {});
  }
};
