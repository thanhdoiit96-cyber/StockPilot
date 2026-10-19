module.exports = (sequelize, DataTypes) => {
  const Portfolio = sequelize.define('Portfolio', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING(120), allowNull: false, defaultValue: 'Danh mục chính' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'portfolios', underscored: true, timestamps: false });
  Portfolio.associate = models => { Portfolio.belongsTo(models.User, { foreignKey: 'user_id' }); Portfolio.hasMany(models.PortfolioTransaction, { foreignKey: 'portfolio_id', as: 'transactions' }); Portfolio.hasMany(models.PortfolioCashFlow, { foreignKey: 'portfolio_id', as: 'cashFlows' }); if (models.PortfolioEvent) Portfolio.hasMany(models.PortfolioEvent, { foreignKey: 'portfolio_id', as: 'events' }); if (models.PortfolioAllocationTarget) Portfolio.hasMany(models.PortfolioAllocationTarget, { foreignKey: 'portfolio_id', as: 'allocationTargets' }); };
  return Portfolio;
};
