module.exports = (sequelize, DataTypes) => {
  const HoldingReconciliationRun = sequelize.define('HoldingReconciliationRun', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }, portfolio_id: { type: DataTypes.UUID, allowNull: false }, as_of: { type: DataTypes.DATEONLY, allowNull: false }, model: { type: DataTypes.STRING(80), allowNull: false }, generation_key: { type: DataTypes.STRING(64), allowNull: false }, input_provenance: { type: DataTypes.JSONB, allowNull: false }, input_provenance_sha256: { type: DataTypes.STRING(64), allowNull: false }, snapshot_sha256: { type: DataTypes.STRING(64), allowNull: false }, status: { type: DataTypes.STRING(30), allowNull: false }, created_at: { type: DataTypes.DATE, allowNull: false }
  }, { tableName: 'holding_reconciliation_runs', underscored: true, timestamps: false });
  HoldingReconciliationRun.associate = models => { HoldingReconciliationRun.belongsTo(models.Portfolio, { foreignKey: 'portfolio_id', as: 'portfolio' }); HoldingReconciliationRun.hasMany(models.HoldingReconciliationApplication, { foreignKey: 'run_id', as: 'applications' }); };
  return HoldingReconciliationRun;
};
