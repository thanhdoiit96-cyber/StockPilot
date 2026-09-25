module.exports = (sequelize, DataTypes) => {
  const SavedRecommendation = sequelize.define('SavedRecommendation', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    criteria: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    result: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'saved_recommendation_snapshots', underscored: true, timestamps: false });
  SavedRecommendation.associate = models => {
    if (models.User) SavedRecommendation.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };
  return SavedRecommendation;
};
