module.exports = (sequelize, DataTypes) => {
  const ForecastOutcomeEvent = sequelize.define('ForecastOutcomeEvent', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }, snapshot_id: { type: DataTypes.UUID, allowNull: false },
    schema_version: { type: DataTypes.STRING(60), allowNull: false }, payload: { type: DataTypes.JSONB, allowNull: false }, payload_sha256: { type: DataTypes.STRING(64), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { tableName: 'forecast_outcome_events', underscored: true, timestamps: false });
  ForecastOutcomeEvent.associate = models => ForecastOutcomeEvent.belongsTo(models.ForecastSnapshot, { foreignKey: 'snapshot_id', as: 'snapshot' });
  return ForecastOutcomeEvent;
};
