module.exports = (sequelize, DataTypes) => {
  const PortfolioAllocationTarget = sequelize.define('PortfolioAllocationTarget', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    portfolio_id: { type: DataTypes.UUID, allowNull: false },
    stock_id: { type: DataTypes.UUID, allowNull: false },
    target_weight_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    alert_threshold_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 5 },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'portfolio_allocation_targets', underscored: true, timestamps: false });
  PortfolioAllocationTarget.associate = models => {
    PortfolioAllocationTarget.belongsTo(models.Portfolio, { foreignKey: 'portfolio_id' });
    PortfolioAllocationTarget.belongsTo(models.Stock, { foreignKey: 'stock_id' });
  };
  return PortfolioAllocationTarget;
};
