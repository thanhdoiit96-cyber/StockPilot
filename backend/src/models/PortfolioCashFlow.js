module.exports = (sequelize, DataTypes) => {
  const PortfolioCashFlow = sequelize.define('PortfolioCashFlow', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    portfolio_id: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.STRING(12), allowNull: false },
    amount: { type: DataTypes.DECIMAL(20, 2), allowNull: false },
    occurred_at: { type: DataTypes.DATE, allowNull: false },
    note: { type: DataTypes.STRING(240), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'portfolio_cash_flows', underscored: true, timestamps: false });
  PortfolioCashFlow.associate = models => { PortfolioCashFlow.belongsTo(models.Portfolio, { foreignKey: 'portfolio_id' }); };
  return PortfolioCashFlow;
};
