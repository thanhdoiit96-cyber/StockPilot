module.exports = (sequelize, DataTypes) => {
  const PortfolioDecision = sequelize.define('PortfolioDecision', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    portfolio_id: { type: DataTypes.UUID, allowNull: false },
    stock_id: { type: DataTypes.UUID, allowNull: false },
    decision_type: { type: DataTypes.STRING(16), allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'ACTIVE' },
    thesis: { type: DataTypes.TEXT, allowNull: false },
    review_date: { type: DataTypes.DATEONLY, allowNull: false },
    invalidation_condition: { type: DataTypes.TEXT, allowNull: false },
    evidence_snapshot: { type: DataTypes.JSONB, allowNull: true },
    closed_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'portfolio_decisions', underscored: true, timestamps: false });
  PortfolioDecision.associate = models => {
    PortfolioDecision.belongsTo(models.Portfolio, { foreignKey: 'portfolio_id' });
    PortfolioDecision.belongsTo(models.Stock, { foreignKey: 'stock_id' });
  };
  return PortfolioDecision;
};
