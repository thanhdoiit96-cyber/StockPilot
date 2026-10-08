module.exports = (sequelize, DataTypes) => {
  const WatchlistItem = sequelize.define('WatchlistItem', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
  user_id: { type: DataTypes.UUID, allowNull: false },
  stock_id: { type: DataTypes.UUID, allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'WATCHING' },
  note: { type: DataTypes.STRING(280), allowNull: true },
  metadata_updated_at: { type: DataTypes.DATE, allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'watchlist_items', underscored: true, timestamps: false, indexes: [{ unique: true, fields: ['user_id', 'stock_id'] }] });
  WatchlistItem.associate = models => {
    WatchlistItem.belongsTo(models.User, { foreignKey: 'user_id' });
    WatchlistItem.belongsTo(models.Stock, { foreignKey: 'stock_id' });
  };
  return WatchlistItem;
};
