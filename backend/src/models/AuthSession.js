module.exports = (sequelize, DataTypes) => {
  const AuthSession = sequelize.define('AuthSession', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: false },
    label: { type: DataTypes.STRING(80), allowNull: true },
    refresh_token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    previous_refresh_token_hash: { type: DataTypes.STRING(64), allowNull: true },
    csrf_token_hash: { type: DataTypes.STRING(64), allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    idle_expires_at: { type: DataTypes.DATE, allowNull: false },
    last_used_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    revoked_at: { type: DataTypes.DATE, allowNull: true },
    revoke_reason: { type: DataTypes.STRING(40), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'auth_sessions', underscored: true, timestamps: false });
  AuthSession.associate = models => {
    if (models.User) AuthSession.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };
  return AuthSession;
};
