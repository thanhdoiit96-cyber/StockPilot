'use strict';
module.exports = (sequelize, DataTypes) => {
  const ForeignFlowDaily = sequelize.define('ForeignFlowDaily', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    stock_id: { type: DataTypes.UUID, allowNull: false }, provider: { type: DataTypes.STRING(80), allowNull: false },
    source: { type: DataTypes.STRING(80), allowNull: false }, provider_symbol: { type: DataTypes.STRING(80), allowNull: false },
    session_date: { type: DataTypes.DATEONLY, allowNull: false }, buy_volume: { type: DataTypes.DECIMAL, allowNull: false },
    sell_volume: { type: DataTypes.DECIMAL, allowNull: false }, buy_value: { type: DataTypes.DECIMAL, allowNull: false },
    sell_value: { type: DataTypes.DECIMAL, allowNull: false }, currency: { type: DataTypes.STRING(10), allowNull: false },
    license: { type: DataTypes.STRING(80), allowNull: false }, license_url: DataTypes.TEXT,
    source_hash: { type: DataTypes.STRING(64), allowNull: false }, fetched_at: { type: DataTypes.DATE, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }, updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'foreign_flow_daily', underscored: true, timestamps: false });
  ForeignFlowDaily.associate = models => ForeignFlowDaily.belongsTo(models.Stock, { foreignKey: 'stock_id', as: 'stock' });
  return ForeignFlowDaily;
};
