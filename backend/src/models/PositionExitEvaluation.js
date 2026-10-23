module.exports = (sequelize, DataTypes) => {
  const PositionExitEvaluation = sequelize.define('PositionExitEvaluation', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }, guidance_id: { type: DataTypes.UUID, allowNull: false },
    schema_version: { type: DataTypes.STRING(80), allowNull: false }, status: { type: DataTypes.STRING(24), allowNull: false },
    horizon_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    payload: { type: DataTypes.JSONB, allowNull: false }, payload_sha256: { type: DataTypes.STRING(64), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'position_exit_evaluations', underscored: true, timestamps: false });
  PositionExitEvaluation.associate = models => { if (models.PositionExitGuidance) PositionExitEvaluation.belongsTo(models.PositionExitGuidance, { foreignKey: 'guidance_id', as: 'guidance' }); };
  return PositionExitEvaluation;
};
