module.exports = (sequelize, DataTypes) => {
  const StockPrice = sequelize.define('StockPrice', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    stock_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    provider: DataTypes.STRING(80),
    provider_symbol: DataTypes.STRING(80),
    interval: DataTypes.STRING(10),
    observed_at: DataTypes.DATE,
    fetched_at: DataTypes.DATE,
    open: DataTypes.DECIMAL,
    high: DataTypes.DECIMAL,
    low: DataTypes.DECIMAL,
    close: DataTypes.DECIMAL,
    volume: DataTypes.DECIMAL,
    trade_count: DataTypes.DECIMAL,
    traded_value: DataTypes.DECIMAL,
    reference_price: DataTypes.DECIMAL,
    ceiling_price: DataTypes.DECIMAL,
    floor_price: DataTypes.DECIMAL,
    currency: DataTypes.STRING(10),
    price_unit: DataTypes.STRING(40),
    is_adjusted: DataTypes.BOOLEAN,
    source_hash: DataTypes.STRING(64),
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'stock_prices',
    underscored: true,
    timestamps: false
  });

  StockPrice.associate = function(models) {
    StockPrice.belongsTo(models.Stock, { foreignKey: 'stock_id', as: 'stock' });
  };

  return StockPrice;
};
