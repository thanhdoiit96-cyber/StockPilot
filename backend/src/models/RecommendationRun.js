module.exports = (sequelize, DataTypes) => {
  const RecommendationRun = sequelize.define('RecommendationRun', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    as_of: { type: DataTypes.DATEONLY, allowNull: false },
    horizon_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 20 },
    provider: { type: DataTypes.STRING(80), allowNull: false },
    model: { type: DataTypes.STRING(80), allowNull: false },
    universe_size: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    selected_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    snapshot_sha256: { type: DataTypes.STRING(64), allowNull: true },
    generation_key: { type: DataTypes.STRING(64), allowNull: true },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'completed' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'recommendation_runs', underscored: true, timestamps: false });
  RecommendationRun.associate = models => { if (models.Recommendation) RecommendationRun.hasMany(models.Recommendation, { foreignKey: 'run_id', as: 'recommendations' }); };
  return RecommendationRun;
};
