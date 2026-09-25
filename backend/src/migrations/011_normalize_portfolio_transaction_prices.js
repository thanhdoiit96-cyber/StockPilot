'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      UPDATE portfolio_transactions AS t
      SET price = t.price * 1000
      WHERE t.price > 0 AND t.price < 1000
        AND EXISTS (
          SELECT 1 FROM stock_prices AS p
          WHERE p.stock_id = t.stock_id AND COALESCE(p.close, p.price) > 1000
        )
    `);
  },
  async down() {
    // Deliberately irreversible: the migration cannot distinguish legacy
    // thousand-unit values from valid VND prices after normalization.
  }
};
