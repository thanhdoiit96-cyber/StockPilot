module.exports = (sequelize, DataTypes) => {
  const Recommendation = sequelize.define('Recommendation', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    run_id: { type: DataTypes.UUID, allowNull: false },
    stock_id: { type: DataTypes.UUID, allowNull: false },
    rank: { type: DataTypes.INTEGER, allowNull: false },
    score: { type: DataTypes.DECIMAL, allowNull: false },
    horizon_days: { type: DataTypes.INTEGER, allowNull: false },
    entry_price: { type: DataTypes.DECIMAL, allowNull: true },
    rationale: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    evaluated_at: { type: DataTypes.DATE, allowNull: true },
    forward_return_pct: { type: DataTypes.DECIMAL, allowNull: true },
    outcome: { type: DataTypes.STRING(30), allowNull: true }
  }, { tableName: 'recommendations', underscored: true, timestamps: false });
  Recommendation.associate = models => { Recommendation.belongsTo(models.RecommendationRun, { foreignKey: 'run_id', as: 'run' }); Recommendation.belongsTo(models.Stock, { foreignKey: 'stock_id', as: 'stock' }); };
  return Recommendation;
};
