module.exports = (sequelize, DataTypes) => {
  const PositionExitGuidance = sequelize.define('PositionExitGuidance', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }, run_id: { type: DataTypes.UUID, allowNull: false }, stock_id: { type: DataTypes.UUID, allowNull: false },
    status: { type: DataTypes.STRING(40), allowNull: false }, payload: { type: DataTypes.JSONB, allowNull: false }, payload_sha256: { type: DataTypes.STRING(64), allowNull: false }, created_at: { type: DataTypes.DATE, allowNull: false }
  }, { tableName: 'position_exit_guidance', underscored: true, timestamps: false });
  PositionExitGuidance.associate = models => { PositionExitGuidance.belongsTo(models.PositionExitRun, { foreignKey: 'run_id', as: 'run' }); PositionExitGuidance.belongsTo(models.Stock, { foreignKey: 'stock_id', as: 'stock' }); };
  return PositionExitGuidance;
};
