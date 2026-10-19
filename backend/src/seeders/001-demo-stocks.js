"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      INSERT INTO stocks (id, code, name, industry, market_cap, created_at, updated_at)
      VALUES
        (:id1, :code1, :name1, :industry1, :market_cap1, NOW(), NOW()),
        (:id2, :code2, :name2, :industry2, :market_cap2, NOW(), NOW()),
        (:id3, :code3, :name3, :industry3, :market_cap3, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        code = EXCLUDED.code,
        name = EXCLUDED.name,
        industry = EXCLUDED.industry,
        market_cap = EXCLUDED.market_cap,
        updated_at = NOW()
    `, {
      replacements: {
        id1: '00000000-0000-0000-0000-000000000001',
        code1: 'FPT',
        name1: 'FPT Corporation',
        industry1: 'Technology',
        market_cap1: 123456789.12,
        id2: '00000000-0000-0000-0000-000000000002',
        code2: 'VHM',
        name2: 'Vinhomes',
        industry2: 'Real Estate',
        market_cap2: 98765432.56,
        id3: '00000000-0000-0000-0000-000000000003',
        code3: 'MWG',
        name3: 'Mobile World',
        industry3: 'Consumer',
        market_cap3: 76854321.34
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('stocks', { code: ['FPT', 'VHM', 'MWG'] }, {});
  }
};
