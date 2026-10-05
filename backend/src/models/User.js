module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'user' },
  display_name: { type: DataTypes.STRING(120), allowNull: true },
  email_verified_at: { type: DataTypes.DATE, allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'users', underscored: true, timestamps: false });
  User.associate = models => {
    if (models.WatchlistItem) User.hasMany(models.WatchlistItem, { foreignKey: 'user_id', as: 'watchlistItems' });
    if (models.Portfolio) User.hasMany(models.Portfolio, { foreignKey: 'user_id', as: 'portfolios' });
    if (models.AuthSession) User.hasMany(models.AuthSession, { foreignKey: 'user_id', as: 'authSessions' });
  };
  return User;
};
