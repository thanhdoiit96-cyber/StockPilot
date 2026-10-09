module.exports = (sequelize, DataTypes) => {
  const RecommendationEvaluationEvent = sequelize.define('RecommendationEvaluationEvent', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    recommendation_id: { type: DataTypes.UUID, allowNull: false }, run_id: { type: DataTypes.UUID, allowNull: false },
    event_type: { type: DataTypes.STRING(40), allowNull: false }, schema_version: { type: DataTypes.STRING(60), allowNull: false },
    payload: { type: DataTypes.JSONB, allowNull: false }, payload_sha256: { type: DataTypes.STRING(64), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { tableName: 'recommendation_evaluation_events', underscored: true, timestamps: false });
  RecommendationEvaluationEvent.associate = models => {
    if (models.Recommendation) RecommendationEvaluationEvent.belongsTo(models.Recommendation, { foreignKey: 'recommendation_id', as: 'recommendation' });
    if (models.RecommendationRun) RecommendationEvaluationEvent.belongsTo(models.RecommendationRun, { foreignKey: 'run_id', as: 'run' });
  };
  return RecommendationEvaluationEvent;
};
