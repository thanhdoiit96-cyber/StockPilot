module.exports = (sequelize, DataTypes) => {
  const ForecastSnapshot = sequelize.define('ForecastSnapshot', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }, generation_key: { type: DataTypes.STRING(64), allowNull: false },
    schema_version: { type: DataTypes.STRING(60), allowNull: false }, provider: { type: DataTypes.STRING(80), allowNull: false }, model_version: { type: DataTypes.STRING(120), allowNull: false },
    horizon_sessions: { type: DataTypes.INTEGER, allowNull: false }, as_of: { type: DataTypes.DATEONLY, allowNull: false }, target_session: { type: DataTypes.DATEONLY, allowNull: true },
    synthetic: { type: DataTypes.BOOLEAN, allowNull: false }, research_only: { type: DataTypes.BOOLEAN, allowNull: false }, payload: { type: DataTypes.JSONB, allowNull: false },
    payload_sha256: { type: DataTypes.STRING(64), allowNull: false }, expires_at: { type: DataTypes.DATE, allowNull: false }, created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { tableName: 'forecast_snapshots', underscored: true, timestamps: false });
  ForecastSnapshot.associate = models => ForecastSnapshot.hasOne(models.ForecastOutcomeEvent, { foreignKey: 'snapshot_id', as: 'outcome' });
  return ForecastSnapshot;
};
