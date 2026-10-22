module.exports = (sequelize, DataTypes) => {
  const HoldingReconciliationApplication = sequelize.define('HoldingReconciliationApplication', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }, run_id: { type: DataTypes.UUID, allowNull: false }, stock_id: { type: DataTypes.UUID, allowNull: false }, status: { type: DataTypes.STRING(30), allowNull: false }, payload: { type: DataTypes.JSONB, allowNull: false }, payload_sha256: { type: DataTypes.STRING(64), allowNull: false }, created_at: { type: DataTypes.DATE, allowNull: false }
  }, { tableName: 'holding_reconciliation_applications', underscored: true, timestamps: false });
  HoldingReconciliationApplication.associate = models => { HoldingReconciliationApplication.belongsTo(models.HoldingReconciliationRun, { foreignKey: 'run_id', as: 'run' }); HoldingReconciliationApplication.belongsTo(models.Stock, { foreignKey: 'stock_id', as: 'stock' }); };
  return HoldingReconciliationApplication;
};
