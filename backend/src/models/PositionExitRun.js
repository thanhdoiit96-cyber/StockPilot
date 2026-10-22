module.exports = (sequelize, DataTypes) => {
  const PositionExitRun = sequelize.define('PositionExitRun', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }, portfolio_id: { type: DataTypes.UUID, allowNull: false },
    as_of: { type: DataTypes.DATEONLY, allowNull: false }, provider: { type: DataTypes.STRING(80), allowNull: false }, model: { type: DataTypes.STRING(80), allowNull: false },
    generation_key: { type: DataTypes.STRING(64), allowNull: false }, input_provenance: { type: DataTypes.JSONB, allowNull: false }, input_provenance_sha256: { type: DataTypes.STRING(64), allowNull: false },
    snapshot_sha256: { type: DataTypes.STRING(64), allowNull: false }, status: { type: DataTypes.STRING(30), allowNull: false }, created_at: { type: DataTypes.DATE, allowNull: false }
  }, { tableName: 'position_exit_runs', underscored: true, timestamps: false });
  PositionExitRun.associate = models => { PositionExitRun.belongsTo(models.Portfolio, { foreignKey: 'portfolio_id', as: 'portfolio' }); if (models.PositionExitGuidance) PositionExitRun.hasMany(models.PositionExitGuidance, { foreignKey: 'run_id', as: 'guidance' }); };
  return PositionExitRun;
};
