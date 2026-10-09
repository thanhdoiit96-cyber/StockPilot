'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('recommendations', 'evaluation_evidence', { type: Sequelize.JSONB, allowNull: true });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('recommendations', 'evaluation_evidence');
  }
};
