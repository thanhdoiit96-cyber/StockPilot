module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define('PortfolioTransaction', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    portfolio_id: { type: DataTypes.UUID, allowNull: false },
    stock_id: { type: DataTypes.UUID, allowNull: false },
    side: { type: DataTypes.STRING(4), allowNull: false },
    quantity: { type: DataTypes.DECIMAL(20, 6), allowNull: false },
    price: { type: DataTypes.DECIMAL(20, 6), allowNull: false },
    fees: { type: DataTypes.DECIMAL(20, 6), allowNull: false, defaultValue: 0 },
    recommendation_context: { type: DataTypes.JSONB, allowNull: true },
    traded_at: { type: DataTypes.DATE, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'portfolio_transactions', underscored: true, timestamps: false });
  Transaction.associate = models => { Transaction.belongsTo(models.Portfolio, { foreignKey: 'portfolio_id' }); Transaction.belongsTo(models.Stock, { foreignKey: 'stock_id' }); };
  return Transaction;
};
